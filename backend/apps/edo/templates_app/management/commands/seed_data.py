from django.core.management.base import BaseCommand

from apps.edo.templates_app.models import Template


class Command(BaseCommand):
    help = "Seed initial demo data"

    def handle(self, *args, **options):
        if Template.objects.exists():
            self.stdout.write(self.style.WARNING("Demo data already exists. Skipping."))
            return

        Template.objects.create(
            title="Коммерческое предложение",
            description="Шаблон коммерческого предложения для клиентов",
            template_type="HTML",
            visibility="PUBLIC",
            owner_id=1,
            allowed_users=[],
            html_content="""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #2F3235; }
        .header { border-bottom: 2px solid #E73F0C; padding-bottom: 20px; margin-bottom: 30px; }
        .content { line-height: 1.6; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Коммерческое предложение</h1>
        <p>Дата: {{date}}</p>
    </div>
    <div class="content">
        <p>Уважаемый(ая) <strong>{{client_name}}</strong>,</p>
        <p>Рады предложить Вам наши услуги.</p>
        <p>Стоимость: <strong>{{price}}</strong> руб.</p>
        <p>{{description}}</p>
    </div>
    <div class="footer">
        <p>С уважением,<br>{{company_name}}</p>
    </div>
</body>
</html>""",
        )

        Template.objects.create(
            title="Договор поставки",
            description="Шаблон договора поставки с плейсхолдерами",
            template_type="DOCX",
            visibility="RESTRICTED",
            owner_id=1,
            allowed_users=[],
            html_content="",
            docx_file=None,
        )

        self.stdout.write(self.style.SUCCESS("Demo data created successfully!"))
