"""Signals для синхронизации legacy-текстовых User.department и User.company
с новыми FK на Department / OrgUnit. Старый код, читающий строки, продолжает
работать, пока не переедет на FK. Финальное удаление — в Фазе 4 плана ЭДО.
"""

from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import User


@receiver(pre_save, sender=User)
def sync_legacy_department_company(sender, instance: User, **kwargs):
    # Приоритет: конкретное подразделение → строка. Если подразделения нет,
    # смотрим на company_unit. Если ни того ни другого — не трогаем legacy-поля,
    # пусть админ/migration-код правят их вручную.
    if instance.department_unit_id:
        try:
            dept = instance.department_unit
        except Exception:
            dept = None
        if dept is not None:
            instance.department = dept.name or ""
            if dept.company_id and not instance.company_unit_id:
                instance.company_unit_id = dept.company_id

    if instance.company_unit_id:
        try:
            comp = instance.company_unit
        except Exception:
            comp = None
        if comp is not None:
            instance.company = comp.name or ""
            if not instance.department_unit_id:
                # Сотрудник сидит прямо на уровне компании — department-строка
                # не имеет смысла, обнуляем, чтобы не путать.
                instance.department = ""
