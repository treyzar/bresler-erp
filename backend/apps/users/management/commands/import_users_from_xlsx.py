"""Сматчить пользователей БД с Excel-файлом и проставить department_unit/company_unit.

Логика:
1. Читаем Excel: колонки [Сотрудник, Подразделение, E-Mail].
2. Для каждого активного User в БД по email находим строку в Excel.
3. Чистим текст подразделения:
   - Убираем числовой префикс «11. », «66. ».
   - Если несколько подразделений через запятую — берём первое.
   - Если значение «Бреслер» — сотрудник сидит на уровне компании (department=NULL).
4. Находим или создаём Department с этим именем под нужным OrgUnit
   (по умолчанию — единственный internal company; если их несколько,
   передаётся через --company-id).
5. Проставляем User.company_unit + User.department_unit.

Тестовые / системные пользователи (по списку SKIP_USERNAMES) пропускаются.
"""

from __future__ import annotations

import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.directory.models import Department, OrgUnit
from apps.users.models import User


SKIP_USERNAMES = {"panin_test_user"}
SKIP_FULL_NAMES = {"пользователь тестовый"}

# Если в Excel в поле «Подразделение» эта строка — сотрудник сидит на уровне
# компании, не в подразделении.
COMPANY_LEVEL_VALUES = {"бреслер"}

NUMERIC_PREFIX_RE = re.compile(r"^\d+\.\s*")


def _clean_dept(raw: str) -> str:
    """«11. Отдел X, Сектор Y» → «Отдел X»."""
    if not raw:
        return ""
    raw = raw.strip()
    # Берём только первый сегмент при перечислении через запятую.
    first = raw.split(",")[0].strip()
    # Снимаем «11. » префикс.
    first = NUMERIC_PREFIX_RE.sub("", first).strip()
    return first


def _read_xlsx(path: Path) -> dict[str, dict]:
    """email-lower → {full_name, dept_raw}."""
    import openpyxl

    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    by_email: dict[str, dict] = {}
    for r in rows[1:]:
        if not r or not r[0]:
            continue
        full_name, dept_raw, email = (r[0] or "").strip(), (r[1] or "").strip(), (r[2] or "").strip()
        if not email:
            continue
        by_email[email.lower()] = {"full_name": full_name, "dept_raw": dept_raw}
    return by_email


class Command(BaseCommand):
    help = "Сматчить активных User по email с Excel-файлом и проставить FK на Department."

    def add_arguments(self, parser):
        parser.add_argument("xlsx", type=str, help="Путь к users_.xlsx (внутри контейнера)")
        parser.add_argument("--company-id", type=int, default=None,
                            help="OrgUnit pk для company_unit (по умолчанию — единственный internal)")
        parser.add_argument("--dry-run", action="store_true",
                            help="Только показать, что бы изменилось")
        parser.add_argument("--force", action="store_true",
                            help="Перезаписать уже проставленные FK")

    def handle(self, *args, **options):
        path = Path(options["xlsx"])
        if not path.exists():
            raise CommandError(f"Файл {path} не найден")

        # Резолвим компанию.
        if options["company_id"]:
            company = OrgUnit.objects.filter(pk=options["company_id"]).first()
            if company is None:
                raise CommandError(f"OrgUnit {options['company_id']} не найден")
        else:
            companies = list(
                OrgUnit.objects.filter(business_role="internal", unit_type="company")
            )
            if len(companies) == 0:
                raise CommandError("Нет ни одной internal-company OrgUnit. Создайте её в админке.")
            if len(companies) > 1:
                raise CommandError(
                    f"Найдено {len(companies)} internal-company. Уточните --company-id из {[c.pk for c in companies]}"
                )
            company = companies[0]
        self.stdout.write(self.style.SUCCESS(f"Компания: {company.name} (pk={company.pk})"))

        excel = _read_xlsx(path)
        self.stdout.write(f"В Excel записей с email: {len(excel)}")

        # Cache существующих Department по (company, name_lower).
        dept_cache: dict[str, Department] = {
            d.name.lower(): d
            for d in Department.objects.filter(company=company, is_active=True)
        }

        prefix = "[DRY-RUN] " if options["dry_run"] else ""
        force = options["force"]

        users = User.objects.filter(is_active=True).exclude(email="")
        if not force:
            users = users.filter(department_unit__isnull=True, company_unit__isnull=True)

        matched_company_only = 0
        matched_full = 0
        skipped = 0
        not_in_excel = 0
        created_depts: list[str] = []

        for user in users.order_by("last_name", "first_name"):
            if user.username in SKIP_USERNAMES:
                skipped += 1
                continue
            if (user.get_full_name() or "").lower() in SKIP_FULL_NAMES:
                skipped += 1
                continue

            xls = excel.get(user.email.lower())
            if not xls:
                not_in_excel += 1
                self.stdout.write(self.style.WARNING(
                    f"  ! не найден в Excel: {user.email} ({user.get_full_name()})"
                ))
                continue

            dept_clean = _clean_dept(xls["dept_raw"])
            company_level = dept_clean.lower() in COMPANY_LEVEL_VALUES

            if not dept_clean or company_level:
                self.stdout.write(
                    f"  · {prefix}{user.email} → company={company.name!r} (на уровне компании)"
                )
                if not options["dry_run"]:
                    user.company_unit = company
                    user.department_unit = None
                    user.save(update_fields=["company_unit", "department_unit"])
                matched_company_only += 1
                continue

            dept = dept_cache.get(dept_clean.lower())
            if dept is None:
                # Создаём как корневой узел дерева Department с unit_type="department"
                # (тип потом поправят руками в админке, если хочется service/sector).
                if options["dry_run"]:
                    self.stdout.write(
                        f"  + [DRY-RUN] СОЗДАТЬ Department {dept_clean!r}"
                    )
                else:
                    dept = Department.add_root(
                        name=dept_clean, unit_type="department", company=company,
                    )
                    dept_cache[dept_clean.lower()] = dept
                created_depts.append(dept_clean)

            self.stdout.write(
                f"  · {prefix}{user.email} → dept={dept_clean!r}"
            )
            if not options["dry_run"]:
                user.company_unit = company
                user.department_unit = dept
                user.save(update_fields=["company_unit", "department_unit"])
            matched_full += 1

        self.stdout.write("")
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Сматчено полностью (с подразделением): {matched_full}"
        ))
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Сматчено только до компании: {matched_company_only}"
        ))
        if created_depts:
            self.stdout.write(self.style.SUCCESS(
                f"{prefix}Новых Department создано бы: {len(set(created_depts))}"
            ))
            for d in sorted(set(created_depts)):
                self.stdout.write(f"    - {d}")
        if skipped:
            self.stdout.write(f"Пропущено (тест-аккаунты): {skipped}")
        if not_in_excel:
            self.stdout.write(self.style.WARNING(f"Не найдено в Excel: {not_in_excel}"))
        self.stdout.write("=" * 70)
