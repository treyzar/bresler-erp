"""Импорт пользователей из Excel-файла + сматчивание/проставление FK.

Что делает (за один проход):
1. Читает Excel: [Сотрудник, Подразделение, E-Mail].
2. Чистит текст подразделения: убирает «11. » префикс, берёт первый сегмент
   при «X, Y», «Бреслер» = уровень компании (department=NULL).
3. Для каждой строки Excel:
   - Ищет User по email. Найден → проставляет company_unit + department_unit.
   - Не найден И флаг --create-missing → создаёт нового User
     (username=email, password=DEFAULT_PASSWORD, ФИО распарсивается из
     «Сотрудник», is_active=True, group'ы не назначаются).
4. Создаёт недостающие Department как корневые узлы под выбранной компанией —
   потом админ перетаскивает их в дереве куда нужно.

Тест-аккаунты (SKIP_USERNAMES / SKIP_FULL_NAMES) пропускаются.
"""

from __future__ import annotations

import re
from pathlib import Path

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from apps.directory.models import Department, OrgUnit
from apps.users.models import User

DEFAULT_PASSWORD = "qwerty123"


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


def _split_full_name(full_name: str) -> tuple[str, str, str]:
    """«Панин Андрей Андреевич» → (last, first, patronymic).
    Если меньше 3 токенов — недостающие будут пустыми.
    """
    parts = (full_name or "").split()
    last = parts[0] if len(parts) >= 1 else ""
    first = parts[1] if len(parts) >= 2 else ""
    patronymic = " ".join(parts[2:]) if len(parts) >= 3 else ""
    return last, first, patronymic


class Command(BaseCommand):
    help = "Сматчить активных User по email с Excel-файлом и проставить FK на Department."

    def add_arguments(self, parser):
        parser.add_argument("xlsx", type=str, help="Путь к users_.xlsx (внутри контейнера)")
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="OrgUnit pk для company_unit (по умолчанию — единственный internal)",
        )
        parser.add_argument("--dry-run", action="store_true", help="Только показать, что бы изменилось")
        parser.add_argument("--force", action="store_true", help="Перезаписать уже проставленные FK")
        parser.add_argument(
            "--create-missing",
            action="store_true",
            help=(
                "Создавать новых User для строк Excel, которых нет в БД "
                f"(username=email, password={DEFAULT_PASSWORD!r}, is_active=True)"
            ),
        )

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
            companies = list(OrgUnit.objects.filter(business_role="internal", unit_type="company"))
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
            d.name.lower(): d for d in Department.objects.filter(company=company, is_active=True)
        }

        prefix = "[DRY-RUN] " if options["dry_run"] else ""
        force = options["force"]
        create_missing = options["create_missing"]
        dry_run = options["dry_run"]

        # Email-set уже существующих в БД пользователей.
        db_emails: dict[str, User] = {u.email.lower(): u for u in User.objects.exclude(email="")}

        matched_company_only = 0
        matched_full = 0
        created_users = 0
        skipped = 0
        created_depts: list[str] = []

        def _resolve_dept(dept_raw: str):
            """(department_obj_or_None, is_company_level)."""
            dept_clean = _clean_dept(dept_raw)
            if not dept_clean or dept_clean.lower() in COMPANY_LEVEL_VALUES:
                return None, True
            dept = dept_cache.get(dept_clean.lower())
            if dept is None:
                if dry_run:
                    created_depts.append(dept_clean)
                else:
                    dept = Department.add_root(
                        name=dept_clean,
                        unit_type="department",
                        company=company,
                    )
                    dept_cache[dept_clean.lower()] = dept
                    created_depts.append(dept_clean)
            return dept, False

        def _apply_to_user(user: User, dept, company_level: bool):
            if not dry_run:
                user.company_unit = company
                user.department_unit = None if company_level else dept
                user.save(update_fields=["company_unit", "department_unit"])

        # Идём по Excel — он источник истины.
        for email, info in excel.items():
            full_name = info["full_name"]
            if full_name.lower() in SKIP_FULL_NAMES:
                skipped += 1
                continue

            user = db_emails.get(email)
            dept_raw = info["dept_raw"]

            if user is not None:
                if user.username in SKIP_USERNAMES:
                    skipped += 1
                    continue
                # Уже есть в БД — обновляем FK.
                if not force and (user.company_unit_id or user.department_unit_id):
                    continue
                dept, company_level = _resolve_dept(dept_raw)
                _apply_to_user(user, dept, company_level)
                if company_level:
                    matched_company_only += 1
                else:
                    matched_full += 1
                continue

            # Не в БД — создаём, если разрешено.
            if not create_missing:
                continue

            last, first, patronymic = _split_full_name(full_name)
            dept, company_level = _resolve_dept(dept_raw)
            self.stdout.write(
                f"  + {prefix}NEW user {email!r} ({full_name}) "
                f"→ {'company-level' if company_level else f'dept={dept.name!r}' if dept else 'dept=?'}"
            )
            if not dry_run:
                u = User(
                    username=email,
                    email=email,
                    last_name=last,
                    first_name=first,
                    patronymic=patronymic,
                    is_active=True,
                    password=make_password(DEFAULT_PASSWORD),
                    company_unit=company,
                    department_unit=None if company_level else dept,
                )
                u.save()
            created_users += 1

        self.stdout.write("")
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS(f"{prefix}Сматчено существующих с подразделением: {matched_full}"))
        self.stdout.write(
            self.style.SUCCESS(f"{prefix}Сматчено существующих на уровне компании: {matched_company_only}")
        )
        if create_missing:
            self.stdout.write(self.style.SUCCESS(f"{prefix}Создано новых User'ов: {created_users}"))
        if created_depts:
            self.stdout.write(self.style.SUCCESS(f"{prefix}Новых Department: {len(set(created_depts))}"))
            for d in sorted(set(created_depts)):
                self.stdout.write(f"    - {d}")
        if skipped:
            self.stdout.write(f"Пропущено (тест-аккаунты): {skipped}")
        self.stdout.write("=" * 70)
