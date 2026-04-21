"""Повторный матчинг User.department/company → User.org_unit.

Вызывается админом после ручного создания дерева OrgUnit с business_role='internal'.
Идемпотентна: уже проставленные org_unit не трогает (если не передан --force).
"""

from django.core.management.base import BaseCommand

from apps.directory.models.orgunit import OrgUnit
from apps.users.models import User


def _find_orgunit(company_text: str, department_text: str):
    company_text = (company_text or "").strip()
    department_text = (department_text or "").strip()

    candidates = OrgUnit.objects.filter(business_role="internal", is_active=True)

    company = None
    if company_text:
        company = candidates.filter(unit_type="company", name__iexact=company_text).first()

    if not department_text:
        return company

    if company is not None:
        subtree = OrgUnit.get_tree(company).exclude(pk=company.pk)
        node = subtree.filter(name__iexact=department_text).first()
        if node is not None:
            return node

    return candidates.filter(name__iexact=department_text).first()


class Command(BaseCommand):
    help = "Повторный матчинг User.department/company в User.org_unit по существующим OrgUnit."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Перезаписать уже проставленные User.org_unit",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Только показать, что бы изменилось, не сохранять",
        )

    def handle(self, *args, **options):
        force = options["force"]
        dry_run = options["dry_run"]

        qs = User.objects.all() if force else User.objects.filter(org_unit__isnull=True)

        total = User.objects.count()
        candidates = qs.count()
        matched = 0
        missing: list[tuple[int, str, str]] = []

        for user in qs:
            dept = (user.department or "").strip()
            comp = (user.company or "").strip()
            if not dept and not comp:
                continue
            node = _find_orgunit(comp, dept)
            if node is None:
                missing.append((user.pk, comp, dept))
                continue
            matched += 1
            if not dry_run:
                user.org_unit = node
                user.save(update_fields=["org_unit"])

        self.stdout.write("=" * 70)
        prefix = "[DRY-RUN] " if dry_run else ""
        self.stdout.write(f"{prefix}Обработано {candidates} из {total} пользователей")
        self.stdout.write(self.style.SUCCESS(f"{prefix}Сматчено: {matched}"))
        if missing:
            self.stdout.write(self.style.WARNING(f"Не удалось сматчить: {len(missing)}"))
            for pk, comp, dept in missing:
                self.stdout.write(f"  user_id={pk}: company={comp!r}, department={dept!r}")
        self.stdout.write("=" * 70)
