from django.contrib.auth.models import AbstractUser, Group
from django.db import models

ALL_MODULES = ["orders", "directory", "devices", "edo", "reports", "purchasing"]

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
    """Custom user model with additional fields for ERP system."""

    patronymic = models.CharField("Отчество", max_length=150, blank=True)
    phone = models.CharField("Телефон", max_length=50, blank=True)
    extension_number = models.CharField("Внутренний номер", max_length=20, blank=True)
    position = models.CharField("Должность", max_length=150, blank=True)
    department = models.CharField("Отдел", max_length=150, blank=True)
    company = models.CharField("Компания", max_length=150, blank=True)
    avatar = models.ImageField("Аватар", upload_to="avatars/", blank=True, null=True)
    is_department_head = models.BooleanField(
        "Руководитель отдела",
        default=False,
        help_text="Руководитель своего org_unit: сектора, отдела, службы или компании",
    )
    org_unit = models.ForeignKey(
        "directory.OrgUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        verbose_name="Подразделение",
        help_text="Узел OrgUnit (сектор/отдел/служба/компания), в котором сотрудник работает",
    )
    supervisor = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subordinates",
        verbose_name="Непосредственный руководитель",
        help_text="Если не задан — определяется автоматически по дереву org_unit",
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
        initials = " ".join(
            f"{p[0]}." for p in (self.first_name, self.patronymic) if p
        )
        last = self.last_name or ""
        if last and initials:
            return f"{last} {initials}"
        return last or initials or (self.username or "")

    @property
    def company_root(self):
        """Ближайший предок org_unit с unit_type='company'. None если org_unit не задан."""
        if not self.org_unit_id:
            return None
        from apps.directory.models.orgunit import OrgUnit
        node = self.org_unit
        while node is not None:
            if node.unit_type == OrgUnit.UnitType.COMPANY:
                return node
            node = node.get_parent()
        return None

    def resolve_supervisor(self):
        """Резолв непосредственного руководителя по §3.3 ТЗ.

        1. supervisor FK (если задан).
        2. is_department_head своего org_unit (кроме себя).
        3. Рекурсивно вверх по дереву.
        """
        if self.supervisor_id:
            return self.supervisor
        if not self.org_unit_id:
            return None
        User = type(self)
        node = self.org_unit
        while node is not None:
            head = User.objects.filter(
                org_unit=node, is_department_head=True, is_active=True
            ).exclude(pk=self.pk).first()
            if head is not None:
                return head
            node = node.get_parent()
        return None
