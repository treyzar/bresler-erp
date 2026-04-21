"""Перенос legacy текстовых User.department / User.company в User.org_unit FK.

Стратегия:
1. Сгруппировать пользователей по паре (company_text, department_text).
2. Для каждой пары найти OrgUnit с business_role='internal':
   - если department_text пустой — ищем company по совпадению name;
   - иначе — company по name, затем внутри его поддерева ищем department по name.
3. Что не нашли — логируем в stdout, админ руками доделает.

Никаких автосозданий новых OrgUnit'ов здесь не делаем: структура подразделений —
ответственность админа (создаётся вручную перед запуском EDO-модуля).
"""

from django.db import migrations


def _find_orgunit(OrgUnit, company_text: str, department_text: str):
    company_text = (company_text or "").strip()
    department_text = (department_text or "").strip()

    candidates = OrgUnit.objects.filter(business_role="internal", is_active=True)

    if company_text:
        company = candidates.filter(unit_type="company", name__iexact=company_text).first()
    else:
        company = None

    if not department_text:
        return company

    if company is not None:
        # Ищем подразделение внутри поддерева этой компании.
        subtree = OrgUnit.get_tree(company).exclude(pk=company.pk)
        node = subtree.filter(name__iexact=department_text).first()
        if node is not None:
            return node

    # Fallback: любой internal-узел с таким именем.
    return candidates.filter(name__iexact=department_text).first()


def forwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    OrgUnit = apps.get_model("directory", "OrgUnit")

    missing: list[tuple[str, str, int]] = []
    total = 0
    matched = 0

    for user in User.objects.all():
        total += 1
        if user.org_unit_id:
            continue
        dept = (user.department or "").strip()
        comp = (user.company or "").strip()
        if not dept and not comp:
            continue
        node = _find_orgunit(OrgUnit, comp, dept)
        if node is None:
            missing.append((comp, dept, user.pk))
            continue
        user.org_unit = node
        user.save(update_fields=["org_unit"])
        matched += 1

    if missing:
        print()
        print("=" * 70)
        print(f"User.org_unit backfill: {matched}/{total} сматчено; {len(missing)} не найдено:")
        for comp, dept, pk in missing:
            print(f"  user_id={pk}: company={comp!r}, department={dept!r}")
        print("Эти записи нужно дозаполнить вручную в Django admin.")
        print("=" * 70)
    else:
        print(f"User.org_unit backfill: {matched}/{total} записей сматчено, ничего не потеряно.")


def backwards(apps, schema_editor):
    # Откат бессмысленен: legacy-текст остаётся в User.department/company, FK просто обнуляется.
    User = apps.get_model("users", "User")
    User.objects.update(org_unit=None)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_user_org_unit_and_supervisor"),
        ("directory", "0010_orgunit_add_service_sector"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
