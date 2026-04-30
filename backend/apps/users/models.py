from django.contrib.auth.models import AbstractUser, Group
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from simple_history.models import HistoricalRecords

from .modules import all_module_slugs

# Для обратной совместимости с data-миграциями, использующими ALL_MODULES.
# НЕ использовать в новом коде — списком модулей теперь управляет apps/users/modules.py.
ALL_MODULES = all_module_slugs()

PREDEFINED_GROUPS = [
    {
        "name": "admin",
        "description": "Администраторы",
        "allowed_modules": ALL_MODULES,
    },
    {
        "name": "otm",
        "description": "Отдел технического маркетинга",
        "allowed_modules": ["orders", "directory", "devices", "edo"],
    },
    {
        "name": "projects",
        "description": "Проектный отдел",
        "allowed_modules": ["orders", "directory", "devices", "edo"],
    },
    {
        "name": "purchasing",
        "description": "Отдел снабжения",
        "allowed_modules": ["orders", "directory", "devices", "edo", "purchasing"],
    },
    {
        "name": "accounting",
        "description": "Бухгалтерия",
        "allowed_modules": ["orders", "reports"],
    },
    {
        "name": "readonly",
        "description": "Просмотр",
        "allowed_modules": ["orders", "directory"],
    },
]


class GroupProfile(models.Model):
    """Extends Django's built-in Group with module access control."""

    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name="profile")
    description = models.CharField("Описание", max_length=255, blank=True)
    allowed_modules = models.JSONField(
        "Доступные модули",
        default=list,
        help_text="Список slug-ов модулей: orders, directory, edo, reports",
    )

    class Meta:
        verbose_name = "Профиль группы"
        verbose_name_plural = "Профили групп"

    def __str__(self):
        return f"{self.group.name} — {', '.join(self.allowed_modules) or '—'}"


class User(AbstractUser):
    """Custom user model. Штатные данные (компания, отдел, должность) живут
    в `Assignment` — у одного пользователя их может быть несколько (совмещение,
    работа в разных юрлицах группы, руководитель нескольких отделов).

    Свойства `company_unit/department_unit/is_department_head/position/...`
    оставлены как read-only @property над primary_assignment — для совместимости
    с шаблонами и кодом, читающим их как простые атрибуты. ORM-фильтры по этим
    «полям» не работают (они не в БД); использовать `User.assignments__company`,
    `User.assignments__is_head` и т.д.
    """

    patronymic = models.CharField("Отчество", max_length=150, blank=True)
    phone = models.CharField("Телефон", max_length=50, blank=True)
    extension_number = models.CharField("Внутренний номер", max_length=20, blank=True)
    avatar = models.ImageField("Аватар", upload_to="avatars/", blank=True, null=True)
    supervisor = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subordinates",
        verbose_name="Непосредственный руководитель",
        help_text="Явный override. Если не задан — определяется по дереву department у assignment.",
    )
    substitute_user = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="substituted_for",
        verbose_name="Замещающий",
        help_text="Кто принимает решения вместо меня в период отсутствия",
    )
    substitute_from = models.DateField(
        "Замещение с",
        null=True,
        blank=True,
        help_text="Дата начала отсутствия (включительно)",
    )
    substitute_until = models.DateField(
        "Замещение до",
        null=True,
        blank=True,
        help_text="Дата окончания отсутствия (включительно)",
    )
    my_customers = models.ManyToManyField(
        "directory.OrgUnit",
        blank=True,
        related_name="assigned_managers",
        verbose_name="Мои заказчики",
    )

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return self.get_full_name() or self.username

    def get_full_name(self):
        parts = [self.last_name, self.first_name, self.patronymic]
        return " ".join(part for part in parts if part)

    @property
    def full_name_short(self) -> str:
        """«Васильев С. А.» — фамилия + инициалы через пробел."""
        initials = " ".join(f"{p[0]}." for p in (self.first_name, self.patronymic) if p)
        last = self.last_name or ""
        if last and initials:
            return f"{last} {initials}"
        return last or initials or (self.username or "")

    # ===== Assignment-derived shims (read-only) =====
    # Совместимость с шаблонами и кодом, читающим эти атрибуты по-старому.
    # Возвращают данные primary_assignment. Не используются в ORM-фильтрах.

    @property
    def primary_assignment(self):
        return (
            self.assignments.filter(is_primary=True)
            .select_related("company", "department")
            .first()
        )

    @property
    def position(self) -> str:
        a = self.primary_assignment
        return a.position if a else ""

    @property
    def department(self) -> str:
        """Имя подразделения primary-assignment (для шаблонов)."""
        a = self.primary_assignment
        if a and a.department_id:
            return a.department.name
        return ""

    @property
    def company(self) -> str:
        """Имя компании primary-assignment (для шаблонов)."""
        a = self.primary_assignment
        return a.company.name if a else ""

    @property
    def company_unit(self):
        """OrgUnit primary-assignment'а (для кода, ожидающего объект)."""
        a = self.primary_assignment
        return a.company if a else None

    @property
    def company_unit_id(self):
        a = self.primary_assignment
        return a.company_id if a else None

    @property
    def department_unit(self):
        """Department primary-assignment'а (для кода, ожидающего объект)."""
        a = self.primary_assignment
        return a.department if a else None

    @property
    def department_unit_id(self):
        a = self.primary_assignment
        return a.department_id if a else None

    @property
    def is_department_head(self) -> bool:
        a = self.primary_assignment
        return bool(a and a.is_head)

    @property
    def company_root(self):
        """Компания primary-assignment'а — alias к company_unit."""
        return self.company_unit

    # ===== Multi-assignment helpers =====

    def active_assignments(self, on_date=None):
        """Assignment'ы, активные на указанную дату (по умолчанию — сегодня).

        Активность: `is_active=True` + (`from_date` IS NULL OR `<=` дата) +
        (`to_date` IS NULL OR `>=` дата).
        """
        if on_date is None:
            from django.utils import timezone

            on_date = timezone.localdate()
        return self.assignments.filter(
            Q(is_active=True),
            Q(from_date__isnull=True) | Q(from_date__lte=on_date),
            Q(to_date__isnull=True) | Q(to_date__gte=on_date),
        )

    def head_of_departments(self):
        """QuerySet[Department] — где user руководитель."""
        from apps.directory.models import Department

        dept_ids = self.assignments.filter(
            is_head=True, is_active=True, department__isnull=False,
        ).values_list("department_id", flat=True)
        return Department.objects.filter(pk__in=dept_ids)

    def head_of_companies(self):
        """QuerySet[OrgUnit] — где user руководитель company-уровня (department=NULL)."""
        from apps.directory.models import OrgUnit

        company_ids = self.assignments.filter(
            is_head=True, is_active=True, department__isnull=True,
        ).values_list("company_id", flat=True)
        return OrgUnit.objects.filter(pk__in=company_ids)

    def companies(self):
        """QuerySet[OrgUnit] — все юрлица, где у user есть active assignment."""
        from apps.directory.models import OrgUnit

        ids = self.assignments.filter(is_active=True).values_list("company_id", flat=True)
        return OrgUnit.objects.filter(pk__in=ids).distinct()

    def departments(self):
        """QuerySet[Department] — все подразделения, где user числится."""
        from apps.directory.models import Department

        ids = self.assignments.filter(
            is_active=True, department__isnull=False,
        ).values_list("department_id", flat=True)
        return Department.objects.filter(pk__in=ids).distinct()

    def resolve_supervisor(self, *, assignment=None):
        """Резолв непосредственного руководителя.

        1. `User.supervisor` (явный override) — приоритет всегда.
        2. Иначе — `assignment` (или primary, если не передан) определяет контекст:
           ищем `is_head=True` начиная с `assignment.department`, поднимаемся
           по дереву Department до корня.
        3. Если дошли до уровня компании — `is_head=True` + `department=NULL`
           в той же компании.
        4. Иначе — None.
        """
        if self.supervisor_id:
            return self.supervisor

        if assignment is None:
            assignment = self.primary_assignment
        if assignment is None:
            return None

        User = type(self)

        if assignment.department_id:
            node = assignment.department
            while node is not None:
                head_user = (
                    User.objects.filter(
                        assignments__department=node,
                        assignments__is_head=True,
                        assignments__is_active=True,
                        is_active=True,
                    )
                    .exclude(pk=self.pk)
                    .order_by("last_name", "first_name", "pk")
                    .first()
                )
                if head_user is not None:
                    return head_user
                node = node.get_parent()

        if assignment.company_id:
            head_user = (
                User.objects.filter(
                    assignments__company_id=assignment.company_id,
                    assignments__department__isnull=True,
                    assignments__is_head=True,
                    assignments__is_active=True,
                    is_active=True,
                )
                .exclude(pk=self.pk)
                .order_by("last_name", "first_name", "pk")
                .first()
            )
            if head_user is not None:
                return head_user

        return None

    def get_active_substitute(self, on_date=None):
        """Возвращает активного замещающего на указанную дату (по умолчанию — сегодня).

        Активность: substitute_user задан + today ∈ [substitute_from, substitute_until].
        Любая из границ может быть NULL (открытый интервал). Возвращает None, если
        замещение не настроено, не активно или замещающий неактивен.
        """
        if not self.substitute_user_id:
            return None
        if on_date is None:
            from django.utils import timezone

            on_date = timezone.localdate()
        if self.substitute_from and on_date < self.substitute_from:
            return None
        if self.substitute_until and on_date > self.substitute_until:
            return None
        sub = self.substitute_user
        if not sub or not sub.is_active:
            return None
        return sub


class Assignment(models.Model):
    """Штатное назначение пользователя: (компания, подразделение, должность).

    Один User может иметь несколько Assignment'ов:
    - совмещение в нескольких подразделениях одной компании;
    - работа в нескольких юрлицах группы;
    - руководитель двух разных отделов одновременно (`is_head=True` × N).

    Ровно один Assignment у пользователя помечается `is_primary=True` —
    это «основное место работы», по нему рендерятся PDF-шаблоны вне EDO,
    подставляется default-контекст в формы.

    EDO-документ создаётся в контексте конкретного Assignment автора:
    `Document.author_assignment` фиксируется на submit и определяет, чьим
    «руководителем» считать `dept_head:self`, чьей компанией — `company_head` и т.д.

    История назначений сохраняется через `simple_history` — увольнение
    реализуется выставлением `is_active=False`, не удалением.
    """

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name="Сотрудник",
    )
    company = models.ForeignKey(
        "directory.OrgUnit",
        on_delete=models.PROTECT,
        related_name="assignments",
        verbose_name="Компания",
        help_text="Юрлицо (OrgUnit с business_role='internal')",
    )
    department = models.ForeignKey(
        "directory.Department",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="assignments",
        verbose_name="Подразделение",
        help_text="Пусто — сотрудник на уровне компании (например, ген.директор)",
    )
    position = models.CharField(
        "Должность",
        max_length=150,
        blank=True,
        help_text="Текстовое название должности в этом назначении",
    )
    is_head = models.BooleanField(
        "Руководитель",
        default=False,
        help_text="Руководитель этого department (или company, если department пуст)",
    )
    is_primary = models.BooleanField(
        "Основное место",
        default=False,
        help_text="Ровно одно у пользователя; используется как default-контекст",
    )
    is_active = models.BooleanField(
        "Активно",
        default=True,
        help_text="False = архивная запись (увольнение/перевод). Не удаляется, "
        "чтобы не ломать исторические ссылки из EDO-документов.",
    )
    from_date = models.DateField("Действует с", null=True, blank=True)
    to_date = models.DateField("Действует по", null=True, blank=True)
    note = models.TextField("Примечание", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Назначение"
        verbose_name_plural = "Назначения"
        ordering = ["user", "-is_primary", "company__name", "department__name"]
        constraints = [
            # Ровно одно is_primary=True на пользователя.
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_primary=True),
                name="uniq_primary_assignment_per_user",
            ),
            # Уникальность (user, company, department) — нельзя два раза в одной паре.
            # PostgreSQL трактует NULL как отдельные значения, поэтому делим на два
            # частичных индекса: для не-NULL department и для NULL department.
            models.UniqueConstraint(
                fields=["user", "company", "department"],
                condition=Q(department__isnull=False),
                name="uniq_user_company_department",
            ),
            models.UniqueConstraint(
                fields=["user", "company"],
                condition=Q(department__isnull=True),
                name="uniq_user_company_no_department",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "is_primary"]),
            models.Index(fields=["company"]),
            models.Index(fields=["department"]),
            models.Index(fields=["is_head"]),
        ]

    def __str__(self):
        parts = [self.user.get_full_name() or self.user.username, "—"]
        if self.position:
            parts.append(self.position + ",")
        if self.department_id:
            parts.append(self.department.name)
        else:
            parts.append(self.company.name)
        return " ".join(parts)

    def clean(self):
        super().clean()
        if self.department_id and self.company_id:
            dept_company_id = self.department.company_id
            if dept_company_id != self.company_id:
                raise ValidationError(
                    {
                        "department": (
                            f"Подразделение принадлежит компании id={dept_company_id}, "
                            f"а в назначении указана компания id={self.company_id}. "
                            "Подразделение должно быть внутри своей компании."
                        ),
                    },
                )
