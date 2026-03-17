from django.db import migrations

PREDEFINED_GROUPS = [
    {
        "name": "admin",
        "description": "Администраторы",
        "allowed_modules": ["orders", "directory", "edo", "reports"],
    },
    {
        "name": "otm",
        "description": "Отдел технического маркетинга",
        "allowed_modules": ["orders", "directory", "edo"],
    },
    {
        "name": "projects",
        "description": "Проектный отдел",
        "allowed_modules": ["orders", "directory", "edo"],
    },
    {
        "name": "procurement",
        "description": "Отдел снабжения",
        "allowed_modules": ["orders", "directory", "edo"],
    },
    {
        "name": "accounting",
        "description": "Бухгалтерия",
        "allowed_modules": ["orders", "reports"],
    },
    {
        "name": "readonly",
        "description": "Просмотр",
        "allowed_modules": ["orders", "directory"],
    },
]


def create_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    GroupProfile = apps.get_model('users', 'GroupProfile')
    for data in PREDEFINED_GROUPS:
        group, _ = Group.objects.get_or_create(name=data["name"])
        GroupProfile.objects.get_or_create(
            group=group,
            defaults={
                "description": data["description"],
                "allowed_modules": data["allowed_modules"],
            },
        )


def delete_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name__in=[g["name"] for g in PREDEFINED_GROUPS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_groupprofile'),
    ]

    operations = [
        migrations.RunPython(create_groups, delete_groups),
    ]
