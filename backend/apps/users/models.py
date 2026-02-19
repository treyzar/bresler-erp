from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with additional fields for ERP system."""

    patronymic = models.CharField("Отчество", max_length=150, blank=True)
    phone = models.CharField("Телефон", max_length=50, blank=True)
    extension_number = models.CharField("Внутренний номер", max_length=20, blank=True)
    position = models.CharField("Должность", max_length=150, blank=True)
    department = models.CharField("Отдел", max_length=150, blank=True)
    company = models.CharField("Компания", max_length=150, blank=True)
    avatar = models.ImageField("Аватар", upload_to="avatars/", blank=True, null=True)

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return self.get_full_name() or self.username

    def get_full_name(self):
        parts = [self.last_name, self.first_name, self.patronymic]
        return " ".join(part for part in parts if part)
