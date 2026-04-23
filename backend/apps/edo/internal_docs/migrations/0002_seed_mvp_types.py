"""Seed 4 MVP-типов документов + цепочки + NumberSequence. Идемпотентно.

Определения — из ТЗ §15.1–§15.4. Менять существующие записи миграция НЕ
пытается (только создаёт новые), чтобы не перетирать правки админа.
"""

from django.db import migrations


TYPES_SPEC = [
    {
        "code": "memo_free",
        "name": "Служебная записка (свободная форма)",
        "description": "Служебная записка в свободной форме, адресованная подразделению.",
        "category": "memo",
        "icon": "file-text",
        "field_schema": [
            {"name": "subject", "label": "Тема", "type": "text", "required": True,
             "placeholder": "Кратко — о чём записка"},
            {"name": "addressee_department", "label": "Адресовано подразделению",
             "type": "department", "required": True,
             "filter": {"company_scope": "author"}},
            {"name": "body", "label": "Текст записки", "type": "markdown", "required": True,
             "placeholder": "Содержание служебной записки..."},
        ],
        "title_template": "Служебная записка «{{ subject }}»",
        "body_template": "{{ body|linebreaks }}",
        "visibility": "department_visible",
        "addressee_mode": "dept_head",
        "initiator_resolver": "author",
        "requires_drawn_signature": False,
        "prefix": "СЗ-СВОБ",
        "chain_name": "Служебка (свободная): руководитель → адресат",
        "chain_steps": [
            {"order": 1, "role_key": "supervisor",
             "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
            {"order": 2, "role_key": "field_dept_head:addressee_department",
             "label": "Руководитель адресата", "action": "approve", "sla_hours": 48},
        ],
    },
    {
        "code": "memo_overtime",
        "name": "Служебная записка на переработку",
        "description": "Разрешение на выход сотрудников в сверхурочное время / выходной.",
        "category": "memo",
        "icon": "clock-alert",
        "field_schema": [
            {"name": "work_type", "label": "Характер работ", "type": "choice", "required": True,
             "choices": [["overtime", "В сверхурочное время"], ["weekend", "В выходной день"]]},
            {"name": "overtime_date", "label": "Дата выхода", "type": "date", "required": True},
            {"name": "time_from", "label": "Время с", "type": "time", "required": True},
            {"name": "time_to", "label": "Время до", "type": "time", "required": True},
            {"name": "responsible", "label": "Ответственный за ОТ", "type": "user", "required": True,
             "filter": {"is_department_head": True},
             "help_text": "Выберите из руководителей подразделений"},
            {"name": "employees", "label": "Список сотрудников", "type": "user_multi", "required": True,
             "help_text": "Кто будет работать в указанное время"},
            {"name": "reason", "label": "Обоснование (опционально)", "type": "textarea",
             "required": False},
        ],
        "title_template": (
            "Служебная записка о работе "
            "{% if work_type == 'overtime' %}в сверхурочное время"
            "{% else %}в выходной день{% endif %} "
            '{{ overtime_date|date:"d.m.Y" }}'
        ),
        "body_template": (
            "Прошу разрешить выход работников "
            "{{ author.department|default:author.company }} "
            "{% if work_type == 'overtime' %}в сверхурочное время"
            "{% else %}в выходной день{% endif %}\n"
            '{{ overtime_date|date:"d.m.Y" }} г. '
            'с {{ time_from|time:"H:i" }} до {{ time_to|time:"H:i" }} часов по списку:\n\n'
            "{% for emp in employees %}    {{ forloop.counter }}. "
            "{{ emp.last_name }} {{ emp.first_name|slice:':1' }}."
            "{% if emp.patronymic %} {{ emp.patronymic|slice:':1' }}.{% endif %}"
            "{% if emp.position %} — {{ emp.position }}{% endif %}\n"
            "{% endfor %}\n"
            "Ответственным за организацию труда, контроль за осуществлением работ, "
            "дисциплиной труда и соблюдением ОТ в это время назначается:\n\n"
            "    {{ responsible.last_name }} "
            "{{ responsible.first_name|slice:':1' }}."
            "{% if responsible.patronymic %} {{ responsible.patronymic|slice:':1' }}.{% endif %}"
            "{% if responsible.position %}, {{ responsible.position }}{% endif %}.\n"
            "{% if reason %}\nОбоснование: {{ reason }}\n{% endif %}"
        ),
        "visibility": "department_visible",
        "addressee_mode": "none",
        "initiator_resolver": "department_head",
        "requires_drawn_signature": False,
        "prefix": "СЗ-ПЕР",
        "chain_name": "Служебка на переработку: руководитель → рук. подразделения → бухгалтерия",
        "chain_steps": [
            {"order": 1, "role_key": "supervisor",
             "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
            {"order": 2, "role_key": "dept_head:parent",
             "label": "Руководитель подразделения", "action": "approve", "sla_hours": 24},
            {"order": 3, "role_key": "group:accounting@company",
             "label": "Бухгалтерия", "action": "approve", "sla_hours": 72},
        ],
    },
    {
        "code": "app_dayoff_workoff",
        "name": "Заявление на отгул с отработкой",
        "description": "Отгул с последующей отработкой рабочего времени.",
        "category": "application",
        "icon": "calendar-sync",
        "field_schema": [
            {"name": "dayoff_date", "label": "Дата отгула", "type": "date", "required": True},
            {"name": "workoff_date", "label": "Дата отработки", "type": "date", "required": True,
             "help_text": "Когда планируете отработать"},
            {"name": "reason", "label": "Причина (опционально)", "type": "textarea",
             "required": False},
        ],
        "title_template": 'Заявление на отгул {{ dayoff_date|date:"d.m.Y" }}',
        "body_template": (
            'Прошу предоставить мне отгул {{ dayoff_date|date:"d.m.Y" }} г. '
            'с отработкой {{ workoff_date|date:"d.m.Y" }} г.\n'
            "{% if reason %}\nПричина: {{ reason }}\n{% endif %}"
        ),
        "visibility": "personal_only",
        "addressee_mode": "none",
        "initiator_resolver": "author",
        "requires_drawn_signature": False,
        "prefix": "ЗАЯВ-ОТГ-ОТР",
        "chain_name": "Отгул с отработкой: руководитель → бухгалтерия (inform)",
        "chain_steps": [
            {"order": 1, "role_key": "supervisor",
             "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
            {"order": 2, "role_key": "group:accounting@company",
             "label": "Бухгалтерия", "action": "inform", "sla_hours": None},
        ],
    },
    {
        "code": "app_free",
        "name": "Заявление (свободная форма)",
        "description": "Заявление в свободной форме, адресованное конкретному сотруднику.",
        "category": "application",
        "icon": "mail",
        "field_schema": [
            {"name": "subject", "label": "Тема", "type": "text", "required": True,
             "placeholder": "Например: О переводе на другую должность"},
            {"name": "addressee_person", "label": "Кому адресовано", "type": "user", "required": True,
             "help_text": "Конкретный получатель заявления"},
            {"name": "body", "label": "Текст заявления", "type": "markdown", "required": True},
        ],
        "title_template": "Заявление «{{ subject }}»",
        "body_template": "{{ body|linebreaks }}",
        "visibility": "personal_only",
        "addressee_mode": "single_user",
        "initiator_resolver": "author",
        "requires_drawn_signature": False,
        "prefix": "ЗАЯВ-СВОБ",
        "chain_name": "Заявление (свободная): руководитель → адресат",
        "chain_steps": [
            {"order": 1, "role_key": "supervisor",
             "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
            {"order": 2, "role_key": "field_user:addressee_person",
             "label": "Адресат заявления", "action": "approve", "sla_hours": 48},
        ],
    },
]


def forwards(apps, schema_editor):
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    ApprovalChainTemplate = apps.get_model("internal_docs", "ApprovalChainTemplate")
    NumberSequence = apps.get_model("core", "NumberSequence")

    for spec in TYPES_SPEC:
        # 1. NumberSequence — один на тип. Идемпотентно по name.
        sequence_name = f"internal_docs_{spec['code']}"
        seq, _ = NumberSequence.objects.get_or_create(
            name=sequence_name,
            defaults={
                "prefix": spec["prefix"],
                "pattern": "{prefix}-{YYYY}-{####}",
                "reset_period": "yearly",
            },
        )
        # 2. ApprovalChainTemplate — одна дефолтная цепочка на тип.
        chain, chain_created = ApprovalChainTemplate.objects.get_or_create(
            name=spec["chain_name"],
            defaults={
                "steps": spec["chain_steps"],
                "is_default": True,
                "is_active": True,
            },
        )
        # 3. DocumentType — пропускаем, если уже есть.
        if DocumentType.objects.filter(code=spec["code"]).exists():
            continue
        DocumentType.objects.create(
            code=spec["code"],
            name=spec["name"],
            description=spec["description"],
            category=spec["category"],
            icon=spec["icon"],
            field_schema=spec["field_schema"],
            body_template=spec["body_template"],
            title_template=spec["title_template"],
            default_chain=chain,
            numbering_sequence=seq,
            requires_drawn_signature=spec["requires_drawn_signature"],
            visibility=spec["visibility"],
            initiator_resolver=spec["initiator_resolver"],
            addressee_mode=spec["addressee_mode"],
            is_active=True,
        )


def backwards(apps, schema_editor):
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    ApprovalChainTemplate = apps.get_model("internal_docs", "ApprovalChainTemplate")
    NumberSequence = apps.get_model("core", "NumberSequence")

    codes = [s["code"] for s in TYPES_SPEC]
    DocumentType.objects.filter(code__in=codes).delete()
    ApprovalChainTemplate.objects.filter(
        name__in=[s["chain_name"] for s in TYPES_SPEC]
    ).delete()
    NumberSequence.objects.filter(
        name__in=[f"internal_docs_{c}" for c in codes]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("internal_docs", "0001_initial"),
        ("core", "0002_seed_sequences"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
