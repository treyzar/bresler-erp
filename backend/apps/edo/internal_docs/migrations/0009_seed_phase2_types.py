"""Seed-миграция: 5 типов документов из Фазы 2 (ТЗ §6 + §15).

Добавляет: memo_bonus_monthly, memo_bonus_quarterly, app_dayoff_unpaid,
vacation_notification (обратный поток — создаётся бухгалтерией, подписывается
сотрудником), travel_estimate. Идемпотентно: пропускает, если код уже есть.
"""

from django.db import migrations


TYPES_SPEC = [
    # ====================================================================
    {
        "code": "memo_bonus_monthly",
        "name": "Служебная записка на ежемесячное премирование",
        "description": "Премирование сотрудников по итогам месяца (создаёт руководитель подразделения).",
        "category": "bonus",
        "icon": "trending-up",
        "field_schema": [
            {"name": "month", "label": "Месяц премирования", "type": "date", "required": True,
             "help_text": "Любая дата внутри отчётного месяца"},
            {"name": "employees_with_amounts", "label": "Список премий",
             "type": "table", "required": True,
             "columns": [
                 {"name": "employee", "label": "Сотрудник", "type": "user"},
                 {"name": "amount", "label": "Сумма (₽)", "type": "money"},
                 {"name": "reason", "label": "Обоснование", "type": "textarea"},
             ]},
            {"name": "total", "label": "Итого", "type": "money", "required": True,
             "help_text": "Сумма всех строк (заполняется автоматически)"},
        ],
        "title_template": 'Премирование за {{ month|date:"F Y" }}',
        "body_template": (
            'Прошу премировать сотрудников {{ author.department_unit.name|default:author.company_unit.name }} '
            'по итогам {{ month|date:"F Y" }} согласно списку:\n\n'
            "{% for row in employees_with_amounts %}"
            "    {{ forloop.counter }}. "
            "{{ row.employee.last_name }} {{ row.employee.first_name|slice:':1' }}."
            "{% if row.employee.patronymic %} {{ row.employee.patronymic|slice:':1' }}.{% endif %}"
            " — {{ row.amount|floatformat:2 }} ₽"
            "{% if row.reason %} ({{ row.reason }}){% endif %}\n"
            "{% endfor %}\n"
            "Итого: {{ total|floatformat:2 }} ₽."
        ),
        "visibility": "department_visible",
        "addressee_mode": "none",
        "initiator_resolver": "department_head",
        "requires_drawn_signature": False,
        "prefix": "СЗ-ПРЕМ-М",
        "chain_name": "Премирование месяц: рук → бухгалтерия → директор",
        "chain_steps": [
            {"order": 1, "role_key": "supervisor",
             "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
            {"order": 2, "role_key": "group:accounting@company",
             "label": "Бухгалтерия", "action": "approve", "sla_hours": 72},
            {"order": 3, "role_key": "company_head",
             "label": "Директор", "action": "approve", "sla_hours": 48},
        ],
    },

    # ====================================================================
    {
        "code": "memo_bonus_quarterly",
        "name": "Служебная записка на квартальное премирование",
        "description": "Премирование сотрудников по итогам квартала / года.",
        "category": "bonus",
        "icon": "award",
        "field_schema": [
            {"name": "period", "label": "Период", "type": "choice", "required": True,
             "choices": [
                 ["Q1", "I квартал"], ["Q2", "II квартал"],
                 ["Q3", "III квартал"], ["Q4", "IV квартал"],
                 ["YEAR", "По итогам года"],
             ]},
            {"name": "year", "label": "Год", "type": "number", "required": True},
            {"name": "employees_with_amounts", "label": "Список премий",
             "type": "table", "required": True,
             "columns": [
                 {"name": "employee", "label": "Сотрудник", "type": "user"},
                 {"name": "amount", "label": "Сумма (₽)", "type": "money"},
                 {"name": "reason", "label": "Обоснование", "type": "textarea"},
             ]},
            {"name": "total", "label": "Итого", "type": "money", "required": True},
        ],
        "title_template": "Премирование {{ period_display }} {{ year }}",
        "body_template": (
            "Прошу премировать сотрудников {{ author.department_unit.name|default:author.company_unit.name }} "
            "по итогам {{ period_display }} {{ year }} года согласно списку:\n\n"
            "{% for row in employees_with_amounts %}"
            "    {{ forloop.counter }}. "
            "{{ row.employee.last_name }} {{ row.employee.first_name|slice:':1' }}."
            "{% if row.employee.patronymic %} {{ row.employee.patronymic|slice:':1' }}.{% endif %}"
            " — {{ row.amount|floatformat:2 }} ₽"
            "{% if row.reason %} ({{ row.reason }}){% endif %}\n"
            "{% endfor %}\n"
            "Итого: {{ total|floatformat:2 }} ₽."
        ),
        "visibility": "department_visible",
        "addressee_mode": "none",
        "initiator_resolver": "department_head",
        "requires_drawn_signature": False,
        "prefix": "СЗ-ПРЕМ-К",
        "chain_name": "Премирование квартал: рук → бухгалтерия → директор",
        "chain_steps": [
            {"order": 1, "role_key": "supervisor",
             "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
            {"order": 2, "role_key": "group:accounting@company",
             "label": "Бухгалтерия", "action": "approve", "sla_hours": 72},
            {"order": 3, "role_key": "company_head",
             "label": "Директор", "action": "approve", "sla_hours": 48},
        ],
    },

    # ====================================================================
    {
        "code": "app_dayoff_unpaid",
        "name": "Заявление на отгул за свой счёт",
        "description": "Отпуск без сохранения заработной платы на 1 или несколько дней.",
        "category": "application",
        "icon": "calendar-x",
        "field_schema": [
            {"name": "date_range", "label": "Период отгула", "type": "date_range", "required": True},
            {"name": "reason", "label": "Причина", "type": "textarea", "required": True,
             "placeholder": "Семейные обстоятельства, лечение и т.п."},
        ],
        "title_template": (
            'Отгул за свой счёт {{ date_range.from|date:"d.m.Y" }} – '
            '{{ date_range.to|date:"d.m.Y" }}'
        ),
        "body_template": (
            "Прошу предоставить мне отпуск без сохранения заработной платы "
            'с {{ date_range.from|date:"«d» F Y" }} г. по '
            '{{ date_range.to|date:"«d» F Y" }} г.\n\n'
            "Причина: {{ reason }}"
        ),
        "visibility": "personal_only",
        "addressee_mode": "none",
        "initiator_resolver": "author",
        "requires_drawn_signature": False,
        "prefix": "ЗАЯВ-ОТГ-СВ",
        "chain_name": "Отгул за свой счёт: рук → бухгалтерия",
        "chain_steps": [
            {"order": 1, "role_key": "supervisor",
             "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
            {"order": 2, "role_key": "group:accounting@company",
             "label": "Бухгалтерия", "action": "approve", "sla_hours": 48},
        ],
    },

    # ====================================================================
    # Обратный поток: создаётся бухгалтером, подписывается сотрудником.
    {
        "code": "vacation_notification",
        "name": "Уведомление об отпуске",
        "description": (
            "Извещение сотруднику о начале планового отпуска. Создаётся бухгалтерией, "
            "подписывается сотрудником под роспись (с рисованной подписью). "
            "Руководитель сотрудника получает копию для информации."
        ),
        "category": "notification",
        "icon": "bell-ring",
        "field_schema": [
            {"name": "employee", "label": "Сотрудник", "type": "user", "required": True,
             "help_text": "Кому адресовано уведомление"},
            {"name": "start_date", "label": "Дата начала отпуска", "type": "date", "required": True},
            {"name": "duration_days", "label": "Продолжительность (дней)", "type": "number", "required": True},
            {"name": "vacation_type", "label": "Вид отпуска", "type": "choice", "required": True,
             "choices": [
                 ["annual", "Ежегодный оплачиваемый"],
                 ["additional", "Дополнительный оплачиваемый"],
             ]},
        ],
        "title_template": (
            "Уведомление об отпуске "
            "{{ employee.last_name }} {{ employee.first_name|slice:':1' }}."
            "{% if employee.patronymic %}{{ employee.patronymic|slice:':1' }}.{% endif %}"
            ' с {{ start_date|date:"d.m.Y" }}'
        ),
        "body_template": (
            "Уважаем{% if employee.patronymic %}ый(ая){% else %}ый(ая){% endif %} "
            "{{ employee.first_name }}{% if employee.patronymic %} {{ employee.patronymic }}{% endif %}!\n\n"
            "Извещаем Вас о том, что в соответствии с графиком отпусков Вам "
            "предоставляется {{ vacation_type_display|lower }} отпуск продолжительностью "
            "{{ duration_days }} календарных дн. "
            'с {{ start_date|date:"«d» F Y" }} г.\n\n'
            "Просьба ознакомиться и расписаться в получении."
        ),
        "visibility": "personal_only",
        "addressee_mode": "single_user",
        "initiator_resolver": "group:accounting",
        "requires_drawn_signature": True,
        "prefix": "УВЕД-ОТП",
        "chain_name": "Уведомление об отпуске: бухгалтер → сотрудник → рук",
        "chain_steps": [
            {"order": 1, "role_key": "author",
             "label": "Бухгалтерия (составитель)", "action": "sign", "sla_hours": 24},
            {"order": 2, "role_key": "field_user:employee",
             "label": "Сотрудник (роспись об ознакомлении)", "action": "sign", "sla_hours": 168},
            {"order": 3, "role_key": "field_user_supervisor:employee",
             "label": "Руководитель сотрудника (для информации)", "action": "inform"},
        ],
    },

    # ====================================================================
    {
        "code": "travel_estimate",
        "name": "Смета на командировку",
        "description": (
            "Расчёт расходов на служебную командировку: транспорт, проживание, суточные. "
            "Подписывается рисованной подписью; согласуется бухгалтерией и директором."
        ),
        "category": "travel",
        "icon": "plane",
        "field_schema": [
            {"name": "destination_city", "label": "Город назначения", "type": "text", "required": True},
            {"name": "purpose", "label": "Цель командировки", "type": "textarea", "required": True},
            {"name": "date_range", "label": "Период командировки", "type": "date_range", "required": True},
            {"name": "transport_cost", "label": "Транспорт (₽)", "type": "money", "required": True},
            {"name": "lodging_cost", "label": "Проживание (₽)", "type": "money", "required": True},
            {"name": "per_diem", "label": "Суточные (₽)", "type": "money", "required": True,
             "help_text": "Рассчитывается автоматически от длительности"},
            {"name": "total", "label": "Итого (₽)", "type": "money", "required": True,
             "help_text": "Сумма всех статей"},
            {"name": "advance_requested", "label": "Запрашивается аванс?", "type": "boolean"},
        ],
        "title_template": (
            'Командировка в {{ destination_city }} '
            '{{ date_range.from|date:"d.m.Y" }} – {{ date_range.to|date:"d.m.Y" }}'
        ),
        "body_template": (
            "Прошу утвердить смету расходов на служебную командировку.\n\n"
            "Город назначения: {{ destination_city }}\n"
            'Период: с {{ date_range.from|date:"«d» F Y" }} г. '
            'по {{ date_range.to|date:"«d» F Y" }} г.\n\n'
            "Цель командировки: {{ purpose }}\n\n"
            "Расходы:\n"
            "    Транспорт:        {{ transport_cost|floatformat:2 }} ₽\n"
            "    Проживание:       {{ lodging_cost|floatformat:2 }} ₽\n"
            "    Суточные:         {{ per_diem|floatformat:2 }} ₽\n"
            "    ИТОГО:            {{ total|floatformat:2 }} ₽\n"
            "{% if advance_requested %}\nЗапрашиваю выдачу аванса в указанной сумме.{% endif %}"
        ),
        "visibility": "department_visible",
        "addressee_mode": "none",
        "initiator_resolver": "author",
        "requires_drawn_signature": True,
        "prefix": "КОМАНД-СМЕТА",
        "chain_name": "Командировка: рук → бухгалтерия → директор",
        "chain_steps": [
            {"order": 1, "role_key": "supervisor",
             "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
            {"order": 2, "role_key": "group:accounting@company",
             "label": "Бухгалтерия", "action": "approve", "sla_hours": 72},
            {"order": 3, "role_key": "company_head",
             "label": "Директор", "action": "sign", "sla_hours": 48},
        ],
    },
]


def forwards(apps, schema_editor):
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    ApprovalChainTemplate = apps.get_model("internal_docs", "ApprovalChainTemplate")
    NumberSequence = apps.get_model("core", "NumberSequence")

    for spec in TYPES_SPEC:
        sequence_name = f"internal_docs_{spec['code']}"
        seq, _ = NumberSequence.objects.get_or_create(
            name=sequence_name,
            defaults={
                "prefix": spec["prefix"],
                "pattern": "{prefix}-{YYYY}-{####}",
                "reset_period": "yearly",
            },
        )
        chain, _ = ApprovalChainTemplate.objects.get_or_create(
            name=spec["chain_name"],
            defaults={
                "steps": spec["chain_steps"],
                "is_default": True,
                "is_active": True,
            },
        )
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
        ("internal_docs", "0008_approvalstep_parallel_mode_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
