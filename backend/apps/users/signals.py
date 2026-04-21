"""Signals для поддержания legacy-текстовых User.department и User.company
в синхроне с User.org_unit — чтобы старый код, опирающийся на эти строки,
не ломался во время переходного периода.

Финальное удаление полей — в Фазе 4 плана ЭДО.
"""

from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import User


@receiver(pre_save, sender=User)
def sync_legacy_department_company(sender, instance: User, **kwargs):
    if not instance.org_unit_id:
        return
    try:
        org_unit = instance.org_unit
    except Exception:
        return

    # department = имя собственно org_unit (сектор/отдел/служба).
    # Если org_unit — это сама компания, department остаётся пустым.
    from apps.directory.models.orgunit import OrgUnit

    if org_unit.unit_type == OrgUnit.UnitType.COMPANY:
        # Сотрудник сидит прямо на уровне компании — department не имеет смысла.
        instance.department = ""
    else:
        instance.department = org_unit.name or ""

    # company = имя ближайшего предка с unit_type='company'.
    company_root = instance.company_root
    if company_root is not None:
        instance.company = company_root.name or ""
