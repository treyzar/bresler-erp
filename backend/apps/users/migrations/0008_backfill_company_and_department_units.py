"""Попытка пересадить legacy-строки User.department/company на новые FK.

Сматчиваем:
- User.company (текст) → OrgUnit (business_role='internal', unit_type='company', name iexact).
- User.department (текст) → Department (name iexact) внутри company — либо
  глобально, если company не сматчилась.

Что не нашли — пишем в stdout, админ доделает вручную. Новые структуры
(OrgUnit-internal и Department-tree) заполняются админом в админке ПЕРЕД
запуском ЭДО-модуля.
"""

from django.db import migrations


def _find_company(OrgUnit, company_text: str):
    company_text = (company_text or "").strip()
    if not company_text:
        return None
    return OrgUnit.objects.filter(
        business_role="internal", unit_type="company",
        name__iexact=company_text, is_active=True,
    ).first()


def _find_department(Department, department_text: str, company):
    department_text = (department_text or "").strip()
    if not department_text:
        return None
    qs = Department.objects.filter(name__iexact=department_text, is_active=True)
    if company is not None:
        scoped = qs.filter(company=company).first()
        if scoped is not None:
            return scoped
    return qs.first()


def forwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    OrgUnit = apps.get_model("directory", "OrgUnit")
    Department = apps.get_model("directory", "Department")

    missing: list[tuple[int, str, str]] = []
    matched_full = 0
    matched_partial = 0
    total = User.objects.count()

    for user in User.objects.all():
        if user.company_unit_id or user.department_unit_id:
            continue
        dept_text = (user.department or "").strip()
        comp_text = (user.company or "").strip()
        if not dept_text and not comp_text:
            continue

        company = _find_company(OrgUnit, comp_text)
        department = _find_department(Department, dept_text, company)

        if company is None and department is None:
            missing.append((user.pk, comp_text, dept_text))
            continue

        # Если нашли департамент — company берём из него (это достовернее, чем строковый match).
        if department is not None and department.company_id:
            user.company_unit_id = department.company_id
            user.department_unit = department
            matched_full += 1
        elif company is not None:
            user.company_unit = company
            matched_partial += 1
        else:
            # Department без company — редкая ветка (fallback из _find_department).
            user.department_unit = department
            matched_partial += 1
        user.save(update_fields=["company_unit", "department_unit"])

    if matched_full or matched_partial or missing:
        print()
        print("=" * 70)
        print(f"User FK backfill: total={total}, matched_full={matched_full}, "
              f"matched_partial={matched_partial}, missing={len(missing)}")
        for pk, comp, dept in missing:
            print(f"  user_id={pk}: company={comp!r}, department={dept!r}")
        if missing:
            print("Эти записи нужно дозаполнить вручную в Django admin.")
        print("=" * 70)


def backwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.update(company_unit=None, department_unit=None)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_user_company_unit_department_unit_supervisor"),
        ("directory", "0010_add_department_model"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
