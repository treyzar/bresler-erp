"""Бэкфилл `Document.author_assignment` для уже существующих документов.

Логика: для каждого документа без author_assignment — ищем у автора Assignment,
совпадающий с снапшотом (`author_company_unit`, `author_department_unit`).
Если не нашли — берём primary. Если у автора нет ни одного — оставляем NULL
(такой документ нельзя пере-резолвить, но снапшоты company/department у него
сохранились — он остаётся видимым по старым индексам).
"""

from django.db import migrations


def forwards(apps, schema_editor):
    Document = apps.get_model("internal_docs", "Document")
    Assignment = apps.get_model("users", "Assignment")

    matched = 0
    fell_back_to_primary = 0
    no_assignment = 0

    for doc in Document.objects.filter(author_assignment__isnull=True).iterator():
        qs = Assignment.objects.filter(
            user_id=doc.author_id,
            company_id=doc.author_company_unit_id,
        )
        if doc.author_department_unit_id:
            qs = qs.filter(department_id=doc.author_department_unit_id)
        else:
            qs = qs.filter(department__isnull=True)
        a = qs.first()

        if a is None:
            a = Assignment.objects.filter(user_id=doc.author_id, is_primary=True).first()
            if a is not None:
                fell_back_to_primary += 1
        else:
            matched += 1

        if a is None:
            no_assignment += 1
            continue

        doc.author_assignment_id = a.pk
        doc.save(update_fields=["author_assignment"])

    if matched or fell_back_to_primary or no_assignment:
        print()
        print("=" * 70)
        print(
            f"Document.author_assignment backfill: matched={matched}, "
            f"fell_back_to_primary={fell_back_to_primary}, no_assignment={no_assignment}",
        )
        print("=" * 70)


def backwards(apps, schema_editor):
    Document = apps.get_model("internal_docs", "Document")
    Document.objects.update(author_assignment=None)


class Migration(migrations.Migration):
    dependencies = [
        ("internal_docs", "0012_document_author_assignment_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
