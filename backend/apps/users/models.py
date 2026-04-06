from django.contrib.auth.models import AbstractUser, Group
from django.db import models

ALL_MODULES = ["orders", "directory", "devices", "edo", "reports"]

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
        "name": "procurement",
        "description": "Отдел снабжения",
        "allowed_modules": ["orders", "directory", "devices", "edo"],
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
        help_text="Даёт доступ к панели руководителя для своего отдела",
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
