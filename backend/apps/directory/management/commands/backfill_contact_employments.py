from django.core.management.base import BaseCommand
from django.db import transaction

from apps.directory.models import Contact, ContactEmployment


class Command(BaseCommand):
    help = (
        "Create a starting ContactEmployment record (is_current=True) for every Contact "
        "that has an org_unit set but no existing employment history. "
        "Idempotent: contacts with any employment record are skipped. "
        "start_date is set to the contact's created_at date."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without writing to the database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        eligible = Contact.objects.filter(
            org_unit__isnull=False,
            employments__isnull=True,
        ).distinct()

        total = eligible.count()
        self.stdout.write(f"Eligible contacts (org_unit set, no employments): {total}")

        if total == 0:
            return

        created = 0
        for contact in eligible.iterator():
            if dry_run:
                self.stdout.write(
                    f"  [dry-run] would create employment for {contact.id} "
                    f"'{contact.full_name}' @ {contact.org_unit_id}"
                )
            else:
                ContactEmployment.objects.create(
                    contact=contact,
                    org_unit=contact.org_unit,
                    position=contact.position,
                    address=contact.address,
                    start_date=contact.created_at.date(),
                    is_current=True,
                )
            created += 1

        verb = "would create" if dry_run else "created"
        self.stdout.write(self.style.SUCCESS(f"Done: {verb} {created} employment record(s)."))
