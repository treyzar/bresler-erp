"""Бэкфилл Assignment'ов из текущих flat-полей User.

Семантика: для каждого User с непустым company_unit_id или department_unit_id
создаётся ровно одна Assignment(is_primary=True) с текущими значениями
(company, department, position, is_head=is_department_head).

Пользователи без company_unit и без department_unit (нет привязки к юрлицу)
бэкфилл пропускает — они остаются без Assignment, как договорено.

Идемпотентность: если у юзера уже есть Assignment(is_primary=True), мы его
не трогаем — это позволяет повторно прогонять миграцию (например, после
ручного хирургического вмешательства).
"""

from django.db import migrations


def _resolve_company(user, OrgUnit):
    if user.company_unit_id:
        return user.company_unit_id
    if user.department_unit_id:
        # Department.company — non-null FK, читаем через тот же historical proxy.
        Department = type(user)._meta.apps.get_model("directory", "Department")
        dept = Department.objects.filter(pk=user.department_unit_id).only("company_id").first()
        if dept is not None:
            return dept.company_id
    return None


def forwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    OrgUnit = apps.get_model("directory", "OrgUnit")
    Assignment = apps.get_model("users", "Assignment")

    created = 0
    skipped_no_anchor = 0
    skipped_existing = 0

    for user in User.objects.all():
        if not user.company_unit_id and not user.department_unit_id:
            skipped_no_anchor += 1
            continue
        if Assignment.objects.filter(user=user, is_primary=True).exists():
            skipped_existing += 1
            continue

        company_id = _resolve_company(user, OrgUnit)
        if company_id is None:
            # company_unit пуст и department_unit либо пуст, либо ссылается на
            # запись с company_id IS NULL (теоретически невозможно — поле
            # non-null FK, но защищаемся на всякий случай).
            skipped_no_anchor += 1
            continue

        Assignment.objects.create(
            user=user,
            company_id=company_id,
            department_id=user.department_unit_id,
            position=user.position or "",
            is_head=bool(user.is_department_head),
            is_primary=True,
            is_active=True,
        )
        created += 1

    if created or skipped_existing or skipped_no_anchor:
        print()
        print("=" * 70)
        print(
            "Assignment backfill: "
            f"created={created}, skipped_existing_primary={skipped_existing}, "
            f"skipped_no_anchor={skipped_no_anchor}",
        )
        print("=" * 70)


def backwards(apps, schema_editor):
    Assignment = apps.get_model("users", "Assignment")
    Assignment.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0010_historicalassignment_assignment"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
