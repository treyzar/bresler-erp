"""Повторный матчинг User.department/company (строки) → User.company_unit / department_unit.

Вызывается админом после ручного создания OrgUnit-internal + Department-дерева.
Идемпотентна: уже проставленные FK не трогает, если не передан --force.
"""

from django.core.management.base import BaseCommand

from apps.directory.models import Department, OrgUnit
from apps.users.models import User


def _find_company(company_text: str):
    company_text = (company_text or "").strip()
    if not company_text:
        return None
    return OrgUnit.objects.filter(
        business_role="internal", unit_type="company",
        name__iexact=company_text, is_active=True,
    ).first()


def _find_department(department_text: str, company):
    department_text = (department_text or "").strip()
    if not department_text:
        return None
    qs = Department.objects.filter(name__iexact=department_text, is_active=True)
    if company is not None:
        scoped = qs.filter(company=company).first()
        if scoped is not None:
            return scoped
    return qs.first()


class Command(BaseCommand):
    help = (
        "Матчинг User.department/company (строка) → User.company_unit и User.department_unit "
        "по существующим OrgUnit (business_role=internal) и Department."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Перезаписать уже проставленные FK",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Только показать, что бы изменилось, не сохранять",
        )

    def handle(self, *args, **options):
        force = options["force"]
        dry_run = options["dry_run"]

        if force:
            qs = User.objects.all()
        else:
            qs = User.objects.filter(company_unit__isnull=True, department_unit__isnull=True)

        total = User.objects.count()
        candidates = qs.count()
        matched_full = 0
        matched_partial = 0
        missing: list[tuple[int, str, str]] = []

        for user in qs:
            dept_text = (user.department or "").strip()
            comp_text = (user.company or "").strip()
            if not dept_text and not comp_text:
                continue
            company = _find_company(comp_text)
            department = _find_department(dept_text, company)
            if company is None and department is None:
                missing.append((user.pk, comp_text, dept_text))
                continue

            if department is not None and department.company_id:
                if not dry_run:
                    user.company_unit_id = department.company_id
                    user.department_unit = department
                    user.save(update_fields=["company_unit", "department_unit"])
                matched_full += 1
            elif company is not None:
                if not dry_run:
                    user.company_unit = company
                    user.save(update_fields=["company_unit"])
                matched_partial += 1
            else:
                if not dry_run:
                    user.department_unit = department
                    user.save(update_fields=["department_unit"])
                matched_partial += 1

        prefix = "[DRY-RUN] " if dry_run else ""
        self.stdout.write("=" * 70)
        self.stdout.write(f"{prefix}Обработано {candidates} из {total} пользователей")
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Полный матч (company + department): {matched_full}"
        ))
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Частичный матч (только одно поле): {matched_partial}"
        ))
        if missing:
            self.stdout.write(self.style.WARNING(f"Не удалось сматчить: {len(missing)}"))
            for pk, comp, dept in missing:
                self.stdout.write(f"  user_id={pk}: company={comp!r}, department={dept!r}")
        self.stdout.write("=" * 70)
