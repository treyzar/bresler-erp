# ТЗ: ЭДО — внутренний документооборот с согласованием

**Статус:** Проектный документ, согласован 2026-04-21.
**Автор:** Сергей Д. + Claude.
**Связанные документы:** [CLAUDE.md](CLAUDE.md), [plan_bresler_erp.md](plan_bresler_erp.md), [plan_best_practices.md](plan_best_practices.md).

---

## 1. Цель

Полностью перенести внутренний документооборот предприятия (заявления, служебные записки, командировочные сметы, уведомления) из локальных Word/Excel-файлов в единую систему с:
- централизованным хранением тел документов в БД;
- типизацией документов и динамическими формами заполнения;
- многошаговыми цепочками согласования с ролями;
- историей и прозрачностью статусов для всех участников;
- личным кабинетом «Мои документы» у каждого сотрудника.

Внешняя переписка (исходящие/входящие письма) продолжает жить в текущем Letter Registry. Канвас-редактор шаблонов (`templates_app`) сохраняется для внешних писем с точной вёрсткой, но из основного меню внутреннего документооборота выносится.

## 2. Границы проекта

**В скоупе:**
- Новый Django-app `apps/edo/internal_docs/`.
- 9 типов документов, определённых в §6.
- Иерархия «сотрудник → руководитель отдела → руководитель подразделения» через OrgUnit-дерево.
- Интеграция с уже существующими: `apps/notifications`, `apps/comments`, `apps/core/events`, `apps/core/naming`, `apps/core/workflow`, `apps/core/links`, `simple_history`, Playwright PDF-пайп.

**Вне скоупа (на будущее):**
- Интеграция с Диадок / СБИС / КриптоПро (настоящая ЭЦП/КЭП).
- Интеграция с 1С:Бухгалтерия (выгрузка согласованных смет).
- Мобильное приложение.
- Канвас-редактор внешних писем — оставляем как есть, в него не инвестируем.
- `apps/edo/doc_builder` (дублёр templates_app на Tiptap) — в Фазе 4 удаляем.

## 3. Ключевые архитектурные решения

### 3.1 Form-based editor, не канвас

Канвас не подходит для 95% задач. Для каждого типа документа фронт рендерит динамическую форму по `field_schema`, пользователь заполняет поля, система генерирует тело документа из `body_template` + значения полей. Предпросмотр готового документа — через единый серверный HTML-рендерер (тот же, что чинили для templates_app, либо отдельный Jinja-пайп).

### 3.2 Подпись

- **По умолчанию:** подписи-картинки нет. «Подписью» сотрудника является запись в `ApprovalStep` (автор, таймстамп, IP, опционально комментарий). Это стандарт индустрии для внутреннего документооборота.
- **Опционально:** рисованная подпись (canvas-мышкой) и FIO подставляются в PDF-рендер для документов с флагом `DocumentType.requires_drawn_signature = True` — применяем к командировочным сметам и уведомлениям об отпуске.
- Настоящая ЭЦП/КЭП — в roadmap Фазы 5+, здесь не планируется.

### 3.3 Иерархия сотрудников: рефакторинг User

Сейчас `User.department` — текстовое поле, совпадение «руководитель–подчинённый» через строковое равенство. Для масштабируемого согласования это неприемлемо.

**Переход:**
1. Добавляем `User.org_unit` — FK на `OrgUnit` (типа `department`, `sector`, `service`, или `company` — любая глубина дерева).
2. Заводим служебную бизнес-роль `OrgUnit.business_role = 'internal'` и расширяем `OrgUnit.UnitType` двумя значениями: `SERVICE` («Служба») и `SECTOR` («Сектор»).
3. Добавляем `User.supervisor` — явный FK на `User` (NULL допустим, для топов).
4. Флаг `is_department_head` оставляем, теперь он означает «руководитель своего `org_unit`» — на любом уровне дерева (сектора, отдела, службы, компании).
5. Data-migration: парсит существующие `User.department` строки, создаёт OrgUnit'ы с `unit_type=department`, проставляет `org_unit`, для руководителей отделов — устанавливает `is_department_head=True`. Ручное дозаполнение в админке.

**Дерево произвольной глубины.** Резолверы и UI работают по parent/child, не привязываясь к конкретному `unit_type`. Реальный пример (Релесофт):

```
OrgUnit "Релесофт"                   unit_type=company, business_role=internal
├── OrgUnit "Служба РЗА"             unit_type=service
│   ├── OrgUnit "Отдел РЗА 1"        unit_type=department
│   │   ├── OrgUnit "Сектор А"       unit_type=sector
│   │   └── OrgUnit "Сектор Б"       unit_type=sector
│   └── OrgUnit "Отдел РЗА 2"        unit_type=department
└── OrgUnit "Отдел проектирования"   unit_type=department
```

У одной компании может быть 2, 3 или 4 уровня — всё валидно. Если сотрудник сидит прямо в «Отделе проектирования» без сектора, его `org_unit` — этот отдел; если в «Секторе А», то `org_unit` — сектор.

**Как резолвится «непосредственный руководитель» сотрудника X:**
1. Если `X.supervisor` задан явно — он.
2. Иначе — head of `X.org_unit` (user с `is_department_head=True` и тем же `org_unit`, кроме самого X).
3. Иначе — head of `X.org_unit.parent` (рекурсивно вверх по дереву).
4. Если ничего не нашлось — ошибка валидации при отправке документа («укажите руководителя вручную»).

### 3.4 Роли в цепочке согласования: две независимые оси

Сотрудник принадлежит **двум ортогональным осям**, и резолверы цепочки их разделяют:

| Ось | Что выражает | Как хранится |
|---|---|---|
| **Функциональная роль** (горизонталь) | Что человек делает в бизнесе: бухгалтер, снабженец, менеджер ОТМ | Django `Group`. Текущие: `accounting`, `admin`, `otm`, `procurement`, `projects`, `readonly`. Cross-company. |
| **Организационная позиция** (вертикаль) | Где работает: Компания → Служба → Отдел → Сектор | `User.org_unit` → `OrgUnit` tree, произвольной глубины |
| **Старшинство** (атрибут) | Руководитель ли он своего подразделения | `User.is_department_head: bool` |

**Ключевой вывод для твоего вопроса 2:** под отделы и сектора **отдельные Django-группы создавать не надо**. Они описываются OrgUnit-деревом, а группы используются только для функциональных ролей. Добавлять ли ещё группы (например, `hr`) — по потребности, не автоматически по каждому подразделению.

**Резолверы `role_key`:**

| Синтаксис | Что резолвит |
|---|---|
| `supervisor` | Непосредственный руководитель автора (алгоритм §3.3) |
| `org_head:self` | Head of `author.org_unit` (если автор — сам head, скипается на следующий уровень) |
| `org_head:parent` | Head of `author.org_unit.parent` |
| `org_head:up(N)` | Head на N уровней выше по дереву |
| `org_head:company` | Head ближайшего предка с `unit_type=company` (директор компании автора) |
| `group:<name>` | Первый активный участник функциональной группы (MVP: первый онлайн за неделю, потом — round-robin) |
| `group:<name>@company` | То же, но ограничено той же компанией-корнем, что и автор. Для multi-tenant режимов обязательно |
| `group_head:<name>` | Участник группы с флагом `is_department_head=True` (например, главбух) |
| `fixed_user:<id>` | Прибитый FK на конкретного `User` (топы, директора-владельцы) |
| `author` | Сам автор (для шагов подписи входящих уведомлений) |

**Пример цепочки** для «Служебка на переработку» для сотрудника Сектора А Отдела РЗА 1 Службы РЗА Релесофта:

```
1. supervisor              → head of "Сектор А"        (approve, SLA 24h)
2. org_head:parent         → head of "Отдел РЗА 1"     (approve, SLA 24h)
3. org_head:company        → директор Релесофт         (approve, SLA 48h)
4. group:accounting@company→ бухгалтер Релесофт         (inform, без SLA)
```

Если у компании нет промежуточного уровня «Служба», шаг 2 всё равно резолвится корректно — он ищет head на один уровень выше сектора, которым оказывается отдел, и всё работает.

### 3.5 Multi-tenant: видимость между компаниями группы

Два режима, переключаются глобально в админке:

| Режим | Поведение |
|---|---|
| **`company_only`** (по умолчанию) | Сотрудники компании A не видят документы компании B, даже если обе в одной группе компаний |
| **`group_wide`** | Публичные документы (`DocumentType.visibility=public`) видны всем сотрудникам группы компаний |

Реализация — singleton-модель `InternalDocFlowConfig(cross_company_scope)` (one row, правится в Django admin). На уровне ORM — фильтр в `Document.objects.for_user(user)`:

```python
if scope == 'company_only':
    qs = qs.filter(author_company_root=user.company_root)
# иначе без доп. фильтра
```

где `user.company_root` — ближайший предок `user.org_unit` с `unit_type=company`.

Для отдельных типов возможен override: `DocumentType.tenancy_override='group_wide'` (например, «Приказ директора холдинга» — виден всем компаниям даже при company_only).

Личные/персональные документы (заявления на отпуск и т.п.) видят автор + согласующие + `is_department_head` своего отдела, независимо от режима.

## 4. Доменная модель

### 4.1 `DocumentType` — справочник типов документов

| Поле | Тип | Описание |
|---|---|---|
| `code` | `slug` PK-кандидат | `memo_free`, `memo_overtime`, `vacation_notification` и т.п. |
| `name` | str(255) | Отображаемое название |
| `category` | choice | `memo` / `application` / `notification` / `travel` / `bonus` |
| `icon` | str | lucide-иконка для UI |
| `field_schema` | JSONField | См. §4.2 |
| `body_template` | TextField | Тело с плейсхолдерами `{{field_name}}` |
| `title_template` | str(255) | Шаблон для `Document.title`, например `Служебная записка о переработке {{date}}` |
| `default_chain` | FK → `ApprovalChainTemplate` | Дефолтная цепочка |
| `numbering_sequence` | FK → `NumberSequence` | Откуда берём номер |
| `requires_drawn_signature` | bool | Показывать ли UI подписи мышкой |
| `visibility` | choice | `personal_only` / `department_visible` / `public` — кто видит документ помимо автора и согласующих |
| `tenancy_override` | choice (nullable) | `null` (использовать глобальный `InternalDocFlowConfig.cross_company_scope`) / `group_wide` / `company_only` — для типов с особой межкомпанийной политикой |
| `initiator_resolver` | choice | `author` (обычный путь) / `hr` / `accounting` — кто может создавать документы этого типа (важно для «Уведомления об отпуске» — их создаёт бухгалтерия, не сотрудник) |
| `addressee_mode` | choice | `none` / `single_user` / `orgunit_head` — куда «отправляется» документ (для уведомлений) |
| `is_active` | bool | soft-disable без удаления |
| `created_at` / `updated_at` | | + simple_history |

### 4.1a `InternalDocFlowConfig` — singleton конфига модуля

| Поле | Тип | Описание |
|---|---|---|
| `cross_company_scope` | choice | `company_only` (default) / `group_wide` — глобальный режим видимости |
| `default_sla_hours` | int | Fallback SLA для шагов без явного значения (default 48) |
| `pdf_cache_ttl_hours` | int | TTL on-demand PDF кеша (default 168 = 7 дней) |
| `updated_at` | datetime | |

Редактируется только группой `admin` через Django admin. В коде доступ через `InternalDocFlowConfig.get_solo()` (singleton-паттерн).

### 4.2 `field_schema` — JSON-схема полей формы

Лёгкий формат, не полный JSON Schema. Пример:
```json
[
  {
    "name": "overtime_date",
    "label": "Дата переработки",
    "type": "date",
    "required": true
  },
  {
    "name": "time_from",
    "label": "Время с",
    "type": "time",
    "required": true
  },
  {
    "name": "time_to",
    "label": "Время до",
    "type": "time",
    "required": true
  },
  {
    "name": "responsible",
    "label": "Ответственный за ОТ",
    "type": "user",
    "required": true,
    "filter": {"is_department_head": true}
  },
  {
    "name": "is_weekend",
    "label": "В выходной день?",
    "type": "boolean"
  },
  {
    "name": "employees",
    "label": "Список сотрудников",
    "type": "user_multi",
    "required": true
  }
]
```

Поддерживаемые типы: `text`, `textarea`, `number`, `money`, `date`, `date_range`, `time`, `boolean`, `choice`, `user`, `user_multi`, `orgunit`, `file`, `markdown`.

### 4.3 `ApprovalChainTemplate` — типовая цепочка согласования

| Поле | Тип | Описание |
|---|---|---|
| `name` | str(255) | «Стандартное ООТМ», «Бухгалтерия + директор» |
| `is_default` | bool | |
| `steps` | JSONField (список) | См. §4.4 |

### 4.4 Формат `steps`

```json
[
  {"order": 1, "role_key": "supervisor", "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
  {"order": 2, "role_key": "group:accounting", "label": "Бухгалтерия", "action": "approve", "sla_hours": 72, "parallel_group": null},
  {"order": 3, "role_key": "orgunit_head:company", "label": "Директор", "action": "approve", "sla_hours": 48}
]
```

- `action`: `approve` / `sign` / `notify_only` / `inform` (последние два — без блокировки).
- `parallel_group`: если указан одинаковый id у нескольких шагов — они идут параллельно; документ переходит дальше, когда все в группе завершены (режим И) либо когда один (режим ИЛИ, по флагу `parallel_mode`).
- `sla_hours`: срок для эскалации и уведомления о просрочке.

### 4.5 `Document` — экземпляр документа

| Поле | Тип | Описание |
|---|---|---|
| `type` | FK → `DocumentType` | |
| `number` | str unique | Получается из `NumberSequence` при переходе из draft → pending |
| `author` | FK → User | |
| `author_org_unit` | FK → OrgUnit | Снепшот на момент создания |
| `title` | str(255) | Из `title_template` + значений полей |
| `field_values` | JSONField | По схеме `type.field_schema` |
| `body_rendered` | TextField | Прогнанный `body_template` с подставленными значениями; фиксируется при submit, чтобы редактирование шаблона задним числом не меняло архив |
| `attachments` | M2M → `DocumentAttachment` | |
| `status` | choice | `draft` / `pending` / `approved` / `rejected` / `cancelled` / `revision_requested` |
| `current_step` | FK → `ApprovalStep` (nullable) | Указывает на активный шаг |
| `chain_snapshot` | JSONField | Копия `ApprovalChainTemplate.steps` на момент submit (чтобы изменения в шаблоне цепочки не ломали активные документы) |
| `addressee` | FK → User (nullable) | Для уведомлений от HR/бухгалтерии — адресат |
| `created_at` / `submitted_at` / `closed_at` | | |
| `history` | | simple_history |

### 4.6 `ApprovalStep` — шаг согласования на экземпляре

| Поле | Тип | Описание |
|---|---|---|
| `document` | FK → Document | |
| `order` | int | |
| `parallel_group` | str (nullable) | |
| `role_key` | str | Строка-резолвер на момент submit |
| `role_label` | str(255) | Человекочитаемо для UI |
| `approver` | FK → User | Резолвится при submit (snapshot), перерезолвится при делегировании |
| `original_approver` | FK → User (nullable) | До делегирования |
| `status` | choice | `pending` / `approved` / `rejected` / `revision_requested` / `skipped` / `delegated` |
| `decided_at` | datetime | |
| `comment` | TextField | |
| `signature_image` | TextField | data-URL, опционально, если `type.requires_drawn_signature` |
| `sla_due_at` | datetime | От `sla_hours` |

### 4.7 `DocumentAttachment`

Отдельная модель, потому что к одному документу могут быть файлы от разных согласующих (например, бухгалтерия приложила расчёт).

| Поле | Тип |
|---|---|
| `document` | FK → Document |
| `file` | FileField |
| `uploaded_by` | FK → User |
| `uploaded_at` | datetime |
| `step` | FK → ApprovalStep (nullable) — если файл приложен в рамках шага |

### 4.8 Справочник «Шапки организаций»

Переиспользуем `OrgUnit` с `business_role='internal'` для предприятия и его филиалов.

Добавляем модель `OrgUnitHead` (легковесно, чтобы не ломать legacy):
```
OrgUnitHead(
  org_unit FK → OrgUnit,
  head_name str(255),       # "Васильев А. В."
  head_position str(255),    # "Директор"
  from_date date, to_date date nullable,   # История смены руководителей
)
```

На момент создания документа `Document.header_snapshot` копирует `{org_unit_name, head_name, head_position}` — чтобы смена директора задним числом не ломала архив.

## 5. Роли и разрешения

| Роль | Возможности |
|---|---|
| **Автор** | Создавать свои документы, редактировать draft, отзывать из согласования до первого approve, вести комментарии |
| **Согласующий** | Видеть входящие, одобрять/отклонять/запрашивать правки, делегировать, прикладывать файлы |
| **Руководитель отдела** (`is_department_head`) | Видеть документы сотрудников своего `org_unit` (даже если не согласующий) — для оперативного контроля |
| **Группа `accounting`** | Создавать «Уведомления об отпуске», видеть все финансовые документы (премии, сметы) |
| **Группа `admin`** | Всё; настройка типов документов и цепочек; принудительная отмена/перезапуск цепочки |

Реализация прав — через `DRF permissions` + queryset-фильтры в `Document.objects.for_user(user)`.

## 6. Типы документов (MVP-набор)

| # | Код | Название | initiator | Поля (field_schema) | Цепочка согласования |
|---|---|---|---|---|---|
| 1 | `memo_free` | Служебная записка (свободная форма) | author | `subject`, `body`(markdown), `addressee_orgunit` | supervisor → addressee_orgunit.head |
| 2 | `memo_overtime` | Служебная записка на переработку | author | `overtime_date`, `time_from`, `time_to`, `is_weekend`, `responsible`(user), `employees`(user_multi), `reason`(text) | supervisor → orgunit_head:division → HR-inform |
| 3 | `memo_bonus_monthly` | Служебная записка на ежемесячное премирование | author (руководитель отдела) | `month`, `employees_with_amounts`(массив: user+сумма+обоснование), `total`(money, readonly) | supervisor → group:accounting → orgunit_head:company |
| 4 | `memo_bonus_quarterly` | Служебная записка на квартальное премирование | author (руководитель отдела) | `quarter`(Q1/Q2/…/год), `employees_with_amounts`, `total` | supervisor → group:accounting → orgunit_head:company |
| 5 | `app_dayoff_workoff` | Заявление на отгул с отработкой | author | `dayoff_date`, `workoff_date`, `reason`(text) | supervisor → group:accounting (inform) |
| 6 | `app_dayoff_unpaid` | Заявление на отгул за свой счёт | author | `date_range`, `reason`(text) | supervisor → group:accounting |
| 7 | `app_free` | Заявление в свободной форме | author | `subject`, `body`(markdown), `addressee_person`(user) | supervisor → addressee_person |
| 8 | `vacation_notification` | Уведомление об отпуске | `group:accounting` | `employee`(user), `start_date`, `duration_days`, `vacation_type`(choice: annual/additional) | accounting подписывает → author (employee) подписывает → inform supervisor |
| 9 | `travel_estimate` | Смета на командировку | author | `destination_city`, `date_range`, `purpose`, `transport_cost`(money), `lodging_cost`(money), `per_diem`(money, autocalc), `total`(money, autocalc), `advance_requested`(bool) | supervisor → group:accounting → orgunit_head:company, `requires_drawn_signature=True` |

Тип 8 (`vacation_notification`) — обратный поток: создаётся бухгалтером, подписывается получателем-сотрудником. Для этого:
- `DocumentType.initiator_resolver = 'group:accounting'` — только бухгалтер может создавать.
- В `chain_snapshot` первый шаг `role_key='author'` — бухгалтер подписывает сам, далее `role_key='fixed_user:{employee_id}'` — сотрудник подписывает полученное, далее `notify_only supervisor`.

## 7. UX / UI

### 7.1 Меню и навигация

Добавляется корневой раздел **«Документооборот»** с подпунктами:
- **Мои документы** (`/edo/my`) — главная страница ЛК: входящие на согласование, мои в работе, черновики, архив.
- **Создать** (`/edo/new`) — каталог типов.
- **Шаблоны внешних писем** (`/edo/templates`) — текущий канвас-редактор, перенесён сюда.
- **Реестр писем** (`/edo/registry`) — текущий реестр.
- **Администрирование** (`/edo/admin`, только группа `admin`) — управление типами документов и цепочками.

### 7.2 «Мои документы» (`/edo/my`)

Четыре вкладки с бейджами-счётчиками:
- **Ждут меня** (красный индикатор, если есть просроченные): `Document.current_step.approver == me AND status == pending`
- **Мои в работе** (те, где я — автор, и статус `pending`/`revision_requested`)
- **Черновики**: `status == draft AND author == me`
- **Архив**: `status IN (approved, rejected, cancelled)` — мои и где я согласовывал

Колонки: `№`, `Тип` (иконка + название), `Заголовок`, `Статус` (бейдж), `Текущий шаг`, `Автор` / `Получатель`, `Обновлено`, `SLA-индикатор` (если просрочка).

### 7.3 Создание документа (`/edo/new/:code`)

Сначала — каталог: плитки категорий (Служебные записки / Заявления / Командировки / Премии / Уведомления) с карточками типов внутри.

После выбора — трёхшаговый wizard:

**Шаг 1 — Шапка**
- Организация (автоподстановка по `user.org_unit` вверх до ближайшей `is_legal_entity=True`)
- «От кого» — `user.full_name + user.position` (readonly из профиля)
- «Кому» — зависит от типа:
  - Для свободной служебки — dropdown OrgUnit (отделы и подразделения внутри компании).
  - Для отпусков/отгулов — автоматически резолвится как supervisor → accounting, пользователю не показываем.
  - Для свободного заявления — выбор конкретного адресата (user).

**Шаг 2 — Заполнение полей**
- Динамический рендер формы из `field_schema`.
- React Hook Form + Zod (схема генерируется из `field_schema` на лету).
- Живой предпросмотр тела справа: `body_template` с подставленными значениями, обновляется на каждый `onChange`.
- Валидация на клиенте + на сервере через тот же JSON-schema-валидатор.

**Шаг 3 — Согласование и подтверждение**
- Показывает резолвенную цепочку: «1. Петров И. И. (руководитель), 2. Бухгалтерия (Сидорова М. К.), 3. Директор Васильев А. В.»
- Автор может до submit вручную подвинуть шаги (удалить необязательные inform, добавить fixed_user-ов «в копию»). Только для своей цепочки, не затрагивая template.
- Чекбокс «Приложить рисованную подпись» (если `type.requires_drawn_signature=True`).
- Кнопки: «Сохранить черновик», «Отправить на согласование».

### 7.4 Страница документа (`/edo/my/:id`)

Левая колонка (70%):
- Шапка документа (номер, тип, автор, даты)
- Таблица полей (readonly или edit-mode для author в draft)
- Тело (body_rendered)
- Вложения

Правая колонка (30%):
- Степпер цепочки согласования: каждый шаг — имя, статус-бейдж, дата решения, первые 80 символов комментария, аватар.
- Если я — текущий согласующий: панель действий «Согласовать / Отклонить / Запросить правки / Делегировать» + поле комментария + опциональная canvas-подпись.
- Комментарии к документу (`apps/comments` GenericFK).

Внизу — Таймлайн (`apps/core` уже имеет компонент): create → submit → step_N_approved → … → closed.

### 7.5 Администрирование типов (`/edo/admin`)

- CRUD `DocumentType`.
- Визуальный редактор `field_schema`: список полей (add/remove/reorder), для каждого — type + label + required + специфичные параметры.
- Редактор `body_template` (textarea + панелька «Вставить поле» — список плейсхолдеров из `field_schema`).
- Редактор цепочек: drag-drop шагов, выбор `role_key` через dropdown, редактирование SLA.
- Песочница «Предпросмотр на моих данных» — прогоняет текущую форму с моими User/OrgUnit.

## 8. Уведомления

Все через существующую `apps/notifications`:

| Событие | Кому | Канал |
|---|---|---|
| `document.submitted` | Текущему согласующему | bell + email |
| `document.approval_requested` (шаг назначен) | Назначенному согласующему | bell + email |
| `document.approved` (завершён) | Автору + всем согласующим (inform) | bell |
| `document.rejected` | Автору | bell + email |
| `document.revision_requested` | Автору | bell + email |
| `document.delegated` | Новому согласующему | bell + email |
| `document.sla_breached` (Celery Beat) | Автору + согласующему + его руководителю | bell + email |

## 9. Интеграция с существующим

| Используем | Как |
|---|---|
| `apps/core/naming.py` | Нумерация документов (`NumberSequence` per `DocumentType`) |
| `apps/core/events.py` | События жизненного цикла, обработчики async через Celery |
| `apps/core/workflow/` | **Требуется расширение:** сейчас workflow одноуровневый. Нужен мультишаг с параллельными ветками |
| `apps/core/links.py` (DocumentLink) | Связи между документами (смета ↔ отчёт, служебка ↔ приказ) |
| `apps/comments/` | Обсуждения на документе |
| `apps/notifications/` | Уведомления и email-дайджесты |
| `simple_history` | Аудит Document + ApprovalStep |
| Playwright PDF-пайп | Экспорт документа в PDF (используем `render_editor_content_html` как движок, или отдельный Jinja-шаблон — решим в Фазе 1) |
| `apps/edo/templates_app/services/html_renderer.py` | Можем переиспользовать для рендера тел документов, если сделаем `body_template` в том же формате editor_content. Но проще и правильнее — Jinja-шаблоны для этих целей. |

## 10. Рефакторинг `apps/users` и `apps/directory` (обязательная зависимость)

Делается в начале Фазы 1, иначе согласование не резолвится.

### 10.1 `OrgUnit`

1. Расширить `OrgUnit.UnitType`:
   - `SERVICE = "service", "Служба"` (новый)
   - `SECTOR = "sector", "Сектор"` (новый)
   - Существующие `COMPANY`, `BRANCH`, `DIVISION`, `DEPARTMENT`, `SITE`, `OTHER` остаются.

2. Заполнить внутреннюю структуру компаний: создать узлы с `business_role='internal'` по фактической организационной структуре (до 10 компаний). Это ручная работа в админке на 1-2 часа, делается до запуска модуля.

3. Пример дерева (Релесофт):
```
OrgUnit "Релесофт"                   unit_type=company, business_role=internal, is_legal_entity=true
├── OrgUnit "Служба РЗА"             unit_type=service
│   ├── OrgUnit "Отдел РЗА 1"        unit_type=department
│   │   ├── OrgUnit "Сектор А"       unit_type=sector
│   │   └── OrgUnit "Сектор Б"       unit_type=sector
│   └── OrgUnit "Отдел РЗА 2"        unit_type=department
└── OrgUnit "Отдел проектирования"   unit_type=department
```

4. Каждый `company`-узел — это отдельный tenant. Фильтр multi-tenant видимости определяет `user.company_root` как ближайший предок `user.org_unit` с `unit_type=company`.

### 10.2 `User`

1. `User.org_unit = FK → OrgUnit` (null=True пока, required для новых EDO-операций).
2. `User.supervisor = FK → User` (null=True) — непосредственный руководитель, опциональный явный override.
3. `User.is_department_head` остаётся, смысл расширяется: «руководитель своего `org_unit`», на любом уровне дерева (сектор/отдел/служба/компания).
4. Data-migration: парсит уникальные значения `User.department` (текст) и `User.company` (текст), fuzzy-матчит на существующие OrgUnit-узлы. Что не смэтчилось — создаёт узлы типа `department` и логирует для ручной ревизии.
5. Починить `apps/users/api/views.py::TeamPerformanceView` — перейти с `user.department == target.department` на `user.org_unit_id == target.org_unit_id` (плюс for_admin — не фильтруется). Регрессия-риск, покрываем тестами.
6. **Deprecate, не удалять:** `User.department` и `User.company` остаются как readonly-поля, заполняются автоматически через signal из `org_unit.name` и `company_root.name` — для обратной совместимости с legacy-кодом, который мог где-то опираться на текстовые значения. Финальное удаление — в Фазе 4.

### 10.3 `apps/core` — расширение workflow

Текущий `apps/core/workflow/` поддерживает только одноуровневые переходы между статусами. Для EDO с многошаговой цепочкой с параллельными ветками нужно:
- `MultiStepWorkflow` — новый класс рядом с существующим, конкретно под Document.
- Поддержка параллельных групп и режимов AND/OR.
- Не ломать существующий Order/Contract workflow.

Реализация — в Фазе 2 (в MVP хватит линейного).

## 11. План разработки

### Фаза 1 — MVP (14–18 рабочих дней)

**Цель:** минимально работающий сценарий «сотрудник подал служебку / заявление → руководитель одобрил → документ в архиве».

| Задача | Оценка |
|---|---|
| Рефакторинг User: `org_unit`, `supervisor`, data-migration, починка TeamPerformance | 3 дня |
| Модели `DocumentType`, `Document`, `ApprovalStep`, `DocumentAttachment` + миграции | 2 дня |
| Сидер с 4 типами документов на MVP: `memo_free`, `memo_overtime`, `app_dayoff_workoff`, `app_free` | 0.5 дня |
| `ChainResolver` сервис + `supervisor`/`group`/`fixed_user` резолверы | 1.5 дня |
| API: CRUD Document, submit, approve, reject, revision_requested, delegate | 2 дня |
| Права + queryset-фильтры | 1 дня |
| Фронт: «Мои документы» (список + 4 вкладки + фильтры) | 1.5 дня |
| Фронт: каталог типов + wizard создания с динамической формой | 3 дня |
| Фронт: страница документа с панелью согласования | 2 дня |
| Серверный рендер тела документа в HTML + PDF-экспорт через Playwright | 1 день |
| Уведомления: events + handlers + e-mail шаблоны | 1 день |
| Комментарии: подключить существующий `apps/comments` через GenericFK | 0.5 дня |
| Smoke-тесты на каждый тип документа (backend + фронт happy path) | 1 день |

**Deliverables:** 4 типа, линейное согласование (до 3 шагов), ЛК, уведомления, PDF.

### Фаза 2 — Все 9 типов + гибкое согласование (12–16 дней)

| Задача | Оценка |
|---|---|
| Остальные 5 типов: `memo_bonus_monthly`, `memo_bonus_quarterly`, `app_dayoff_unpaid`, `vacation_notification`, `travel_estimate` | 3 дня |
| Обратный поток для `vacation_notification` (бухгалтер → сотрудник) | 1 день |
| Параллельные ветки в `ApprovalChainTemplate` | 2 дня |
| Делегирование + замещение (с `User.substitute` FK на время отпуска) | 2 дня |
| Приложения от согласующих, не только от автора | 1 день |
| Canvas-подпись в UI + вставка в PDF для документов с `requires_drawn_signature` | 2 дня |
| Email-link согласование: подписанные токены в email, публичная страница `/edo/approve/<token>/` без авторизации, одноразовый approve/reject с комментарием | 2 дня |
| Календарь SLA + Celery Beat задача `check_sla_breaches` | 1 день |
| `DocumentLink` интеграция: связка смета↔отчёт, служебка↔приказ | 1 день |

### Фаза 3 — Админка и справочники (6–8 дней)

| Задача | Оценка |
|---|---|
| UI CRUD `DocumentType` | 2 дня |
| Визуальный редактор `field_schema` | 2 дня |
| Визуальный редактор `ApprovalChainTemplate.steps` | 1.5 дня |
| Справочник «Шапки организаций» (`OrgUnitHead`) + UI | 1 день |
| Отчёты: «У кого зависли документы», «SLA breach», «Топ по типам за период» | 1.5 дня |

### Фаза 4 — Полировка и долги (3–5 дней)

| Задача | Оценка |
|---|---|
| Массовые операции (отмена / напоминание всем по фильтру) | 1 день |
| Экспорт архива ZIP за период | 0.5 дня |
| Миграция Letter Registry: перенос в новую модель как тип `external_outgoing_letter`/`external_incoming_letter` или оставить изолированным (решить в процессе) | 1 день |
| Удалить `apps/edo/doc_builder` (дублёр templates_app с Tiptap) | 0.5 дня |
| Замер производительности: `for_user` queryset под нагрузкой 10k документов, индексы | 1 день |
| Документация: админский гайд, пользовательский гайд | 1 день |

### Фаза 5+ (идеи на будущее, не планируем)

- Интеграция с Диадок/СБИС для внешних документов (КЭП).
- Интеграция с 1С:Бухгалтерия (выгрузка утверждённых смет и премий).
- Мобильное приложение / PWA для согласования с телефона.
- OCR распознавание отсканированных заявлений и автозаполнение формы.
- BI-дашборд: скорость согласований по отделам, узкие места.

## 12. Тестирование

- **Backend:** pytest, per-model factories (Factory Boy), e2e-тесты на каждый тип документа («создание → полный pass через цепочку»). Цель покрытия: 85% для нового кода.
- **Frontend:** Vitest (unit) для `ChainResolver`-клиентской логики и для генерации Zod-схемы из `field_schema`. Playwright-e2e — опционально, для критических путей submit/approve.
- **Permission-тесты:** отдельный пакет с матрицами «роль × действие», прогоняется на каждом типе документа.

## 13. Риски

| Риск | Митигация |
|---|---|
| Рефакторинг `User.department` → `org_unit` поломает `TeamPerformanceView` или другие места | Покрываем тестами ДО миграции, делаем smoke-тест на dev-базе |
| `field_schema` JSON без строгой схемы может разъезжаться | Валидатор на бэкенде через Pydantic/DataClass, схемы хранятся как Python-литералы в `initial_data.py` для MVP-типов, UI-редактор — потом |
| Цепочки с несколькими параллельными ветками сложно UX'ить | В MVP — только линейные. Параллельные добавляем в Фазе 2 |
| Пользователи захотят редактировать тело документа «поверх» шаблона | В MVP — нельзя. В Фазе 3, если спрос, добавить «режим свободного редактирования» с пометкой в истории |
| Бухгалтерия может не успеть согласовать за SLA, сотрудники не получат уведомление об отпуске вовремя | SLA-индикаторы + эскалация на руководителя бухгалтерии |
| Переиспользование `html_renderer` из templates_app может создать coupling | Для body-рендера лучше завести отдельный Jinja-пайп в `apps/edo/internal_docs/services/body_renderer.py` |

## 14. Принятые решения (финализировано 2026-04-21)

1. **Организационная структура.** Группа компаний из 5-10+ компаний (до десятков в перспективе). Филиалов нет. Иерархия отделов произвольной глубины: `Компания → Служба → Отдел → Сектор`, либо короче `Компания → Отдел`. Архитектура: OrgUnit-дерево, резолверы ходят по parent/child и не зависят от `unit_type`. Добавляем в `UnitType` значения `SERVICE` и `SECTOR` (см. §10.1).
2. **Функциональные группы Django.** Оставляем текущий набор (`accounting`, `admin`, `otm`, `procurement`, `projects`, `readonly`), при необходимости добавляем по запросу (например `hr`). **Группы под отделы/сектора НЕ создаём** — это другая ось (§3.4). Для мульти-компанийного контекста используем синтаксис резолвера `group:accounting@company`, который ограничивает поиск участников группы той же компанией, что и автор.
3. **Нумерация.** Отдельный `NumberSequence` на каждый `DocumentType`, префикс из `code` + год + порядковый номер. Примеры: `СЗ-СВОБ-2026-0001`, `СЗ-ПЕР-2026-0001`, `ЗАЯВ-ОТГ-2026-0001`, `КОМАНД-СМЕТА-2026-0001`.
4. **Хранение PDF.** On-demand генерация + файловый кеш на диске (`/media/edo_pdf_cache/{document_id}/{hash}.pdf`) с TTL 7 дней (настраивается через `InternalDocFlowConfig.pdf_cache_ttl_hours`). Хэш считается от `(field_values, chain_snapshot, signature_images)` — любое изменение инвалидирует кеш.
5. **Multi-tenant.** Singleton-конфиг `InternalDocFlowConfig.cross_company_scope` с режимами `company_only` (default) и `group_wide`. Переключается админом в Django admin. Per-type override через `DocumentType.tenancy_override` (для редких случаев типа «Приказ холдинга» — виден всем независимо от режима). Подробности см. §3.5.

---

## 15. Спецификация MVP-типов документов (Фаза 1)

### 15.0 Общие соглашения

**Движок шаблонов.** Django Template Language (не наш регекс-подстановщик и не Jinja2 через отдельный пакет). Причины: уже в проекте, знакомый синтаксис, встроенные фильтры (`|date`, `|time`, `|default`, `|linebreaks`), безопасен по умолчанию (auto-escaping). Alias: `apps/edo/internal_docs/services/body_renderer.py` → `render_body(template_str, context) -> str`.

**Reserved context** (доступен в любом `body_template` и `title_template`):

| Переменная | Тип | Примеры |
|---|---|---|
| `author` | `User` | `author.full_name` («Васильев Сергей Андреевич»), `author.full_name_short` («Васильев С. А.»), `author.position`, `author.org_unit.name`, `author.company_root.name` |
| `today` | `date` | `{{ today\|date:"d.m.Y" }}` → «21.04.2026» |
| `document` | `Document` | `document.number` (после submit), `document.created_at` |
| `fields` | `dict` | Плоский доступ к `field_values`: `{{ fields.overtime_date\|date:"d.m.Y" }}` |

Поля можно также использовать напрямую по имени: `{{ overtime_date|date:"d.m.Y" }}` — внутренне это `{{ fields.overtime_date|date:"d.m.Y" }}`.

**Рендер значений по типам полей:**

| Тип поля | В шаблоне | Пример |
|---|---|---|
| `text` / `textarea` / `markdown` | plain string | `{{ subject }}` |
| `date` | применить фильтр: `{{ overtime_date\|date:"d.m.Y" }}` | «21.04.2026» |
| `date_range` | `{{ date_range.from\|date:"d.m.Y" }} – {{ date_range.to\|date:"d.m.Y" }}` | «21.04.2026 – 25.04.2026» |
| `time` | `{{ time_from\|time:"H:i" }}` | «09:00» |
| `number` / `money` | `{{ total\|floatformat:2 }}` | «12000.00» |
| `boolean` | `{% if is_weekend %}да{% else %}нет{% endif %}` | |
| `choice` | По умолчанию — code (`overtime`). Для отображения используем сопряжённое computed-поле `{field}_display` (бэкенд добавляет его в context автоматически): `{{ work_type_display }}` | «В сверхурочное время» |
| `user` | FK, рендерится через свойства: `{{ responsible.full_name_short }} ({{ responsible.position }})` | «Петров И. И. (начальник отдела)» |
| `user_multi` | Список — итерируется: `{% for emp in employees %}- {{ emp.full_name_short }}{% endfor %}` | |
| `orgunit` | `{{ addressee_orgunit.name }}` | «Служба РЗА» |

**PDF-layout.** Body — это только тело документа. Шапка («От кого» / «Кому» / организация) и подвал (дата, подпись-строка) рендерятся из фиксированного layout в PDF, не из `body_template`. Layout живёт в `apps/edo/internal_docs/templates/edo/pdf_base.html` (Django template) и переиспользуется всеми типами.

**Резолверы в цепочке — дополнение к §3.4.** В MVP вводим ещё два полевых резолвера:

| Синтаксис | Что резолвит |
|---|---|
| `field_user:<field_name>` | User, на которого указывает FK-поле `field_name` в field_values (например, `addressee_person` в `app_free`) |
| `field_orgunit_head:<field_name>` | Head of the OrgUnit referenced by field `field_name` (например, `addressee_orgunit` в `memo_free`) |

**Валидация field_schema на бэке.** Через Pydantic-like dataclass:
```python
@dataclass
class FieldSpec:
    name: str
    label: str
    type: Literal["text", "textarea", "markdown", "number", "money",
                  "date", "date_range", "time", "boolean", "choice",
                  "user", "user_multi", "orgunit", "file"]
    required: bool = False
    choices: list[tuple[str, str]] | None = None  # для type=choice
    filter: dict | None = None                     # для type=user: filters на queryset
    placeholder: str | None = None
    help_text: str | None = None
```

---

### 15.1 `memo_free` — Служебная записка в свободной форме

| Свойство | Значение |
|---|---|
| `name` | Служебная записка (свободная форма) |
| `category` | `memo` |
| `icon` | `file-text` |
| `initiator_resolver` | `author` |
| `addressee_mode` | `orgunit_head` |
| `visibility` | `department_visible` |
| `requires_drawn_signature` | `False` |
| `numbering` | `СЗ-СВОБ-{YYYY}-{####}` |

**`field_schema`:**
```json
[
  {"name": "subject", "label": "Тема", "type": "text", "required": true, "placeholder": "Кратко — о чём записка"},
  {"name": "addressee_orgunit", "label": "Адресовано подразделению", "type": "orgunit", "required": true, "filter": {"business_role": "internal"}},
  {"name": "body", "label": "Текст записки", "type": "markdown", "required": true, "placeholder": "Содержание служебной записки..."}
]
```

**`title_template`:** `Служебная записка «{{ subject }}»`

**`body_template`:**
```
{{ body|linebreaks }}
```

**`default_chain.steps`:**
```json
[
  {"order": 1, "role_key": "supervisor",                    "label": "Непосредственный руководитель",   "action": "approve", "sla_hours": 24},
  {"order": 2, "role_key": "field_orgunit_head:addressee_orgunit", "label": "Руководитель адресата",          "action": "approve", "sla_hours": 48}
]
```

Примечание: если адресат совпадает с `author.org_unit` или с отделом, head которого — непосредственный руководитель автора, второй шаг скипается при резолве (тот же User).

---

### 15.2 `memo_overtime` — Служебная записка на переработку

| Свойство | Значение |
|---|---|
| `name` | Служебная записка на переработку |
| `category` | `memo` |
| `icon` | `clock-alert` |
| `initiator_resolver` | `author` |
| `addressee_mode` | `none` |
| `visibility` | `department_visible` |
| `requires_drawn_signature` | `False` |
| `numbering` | `СЗ-ПЕР-{YYYY}-{####}` |

**`field_schema`:**
```json
[
  {"name": "work_type", "label": "Характер работ", "type": "choice", "required": true,
   "choices": [["overtime", "В сверхурочное время"], ["weekend", "В выходной день"]]},
  {"name": "overtime_date", "label": "Дата выхода", "type": "date", "required": true},
  {"name": "time_from", "label": "Время с", "type": "time", "required": true},
  {"name": "time_to", "label": "Время до", "type": "time", "required": true},
  {"name": "responsible", "label": "Ответственный за ОТ", "type": "user", "required": true,
   "filter": {"is_department_head": true}, "help_text": "Выберите из руководителей подразделений"},
  {"name": "employees", "label": "Список сотрудников", "type": "user_multi", "required": true,
   "help_text": "Кто будет работать в указанное время"},
  {"name": "reason", "label": "Обоснование (опционально)", "type": "textarea", "required": false}
]
```

**`title_template`:** `Служебная записка о работе {% if work_type == 'overtime' %}в сверхурочное время{% else %}в выходной день{% endif %} {{ overtime_date|date:"d.m.Y" }}`

**`body_template`:**
```
Прошу разрешить выход работников {{ author.org_unit.name }} {% if work_type == 'overtime' %}в сверхурочное время{% else %}в выходной день{% endif %}
{{ overtime_date|date:"«d» F Y" }} г. с {{ time_from|time:"H:i" }} до {{ time_to|time:"H:i" }} часов по списку:

{% for emp in employees %}    {{ forloop.counter }}. {{ emp.full_name }} — {{ emp.position }}
{% endfor %}
Ответственным за организацию труда, контроль за осуществлением работ, дисциплиной труда и соблюдением ОТ в это время назначается:

    {{ responsible.full_name }}, {{ responsible.position }}.
{% if reason %}

Обоснование: {{ reason }}
{% endif %}
```

**`default_chain.steps`:**
```json
[
  {"order": 1, "role_key": "supervisor",                 "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
  {"order": 2, "role_key": "org_head:parent",            "label": "Руководитель подразделения",    "action": "approve", "sla_hours": 24},
  {"order": 3, "role_key": "group:accounting@company",   "label": "Бухгалтерия",                    "action": "inform",  "sla_hours": null}
]
```

---

### 15.3 `app_dayoff_workoff` — Заявление на отгул с отработкой

| Свойство | Значение |
|---|---|
| `name` | Заявление на отгул с отработкой |
| `category` | `application` |
| `icon` | `calendar-sync` |
| `initiator_resolver` | `author` |
| `addressee_mode` | `none` |
| `visibility` | `personal_only` |
| `requires_drawn_signature` | `False` |
| `numbering` | `ЗАЯВ-ОТГ-ОТР-{YYYY}-{####}` |

**`field_schema`:**
```json
[
  {"name": "dayoff_date", "label": "Дата отгула", "type": "date", "required": true},
  {"name": "workoff_date", "label": "Дата отработки", "type": "date", "required": true,
   "help_text": "Когда планируете отработать"},
  {"name": "reason", "label": "Причина (опционально)", "type": "textarea", "required": false}
]
```

**`title_template`:** `Заявление на отгул {{ dayoff_date|date:"d.m.Y" }}`

**`body_template`:**
```
Прошу предоставить мне отгул {{ dayoff_date|date:"«d» F Y" }} г. с отработкой {{ workoff_date|date:"«d» F Y" }} г.
{% if reason %}

Причина: {{ reason }}
{% endif %}
```

**`default_chain.steps`:**
```json
[
  {"order": 1, "role_key": "supervisor",                 "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
  {"order": 2, "role_key": "group:accounting@company",   "label": "Бухгалтерия",                    "action": "inform",  "sla_hours": null}
]
```

---

### 15.4 `app_free` — Заявление в свободной форме

| Свойство | Значение |
|---|---|
| `name` | Заявление (свободная форма) |
| `category` | `application` |
| `icon` | `mail` |
| `initiator_resolver` | `author` |
| `addressee_mode` | `single_user` |
| `visibility` | `personal_only` |
| `requires_drawn_signature` | `False` |
| `numbering` | `ЗАЯВ-СВОБ-{YYYY}-{####}` |

**`field_schema`:**
```json
[
  {"name": "subject", "label": "Тема", "type": "text", "required": true, "placeholder": "Например: О переводе на другую должность"},
  {"name": "addressee_person", "label": "Кому адресовано", "type": "user", "required": true,
   "help_text": "Конкретный получатель заявления"},
  {"name": "body", "label": "Текст заявления", "type": "markdown", "required": true}
]
```

**`title_template`:** `Заявление «{{ subject }}»`

**`body_template`:**
```
{{ body|linebreaks }}
```

**`default_chain.steps`:**
```json
[
  {"order": 1, "role_key": "supervisor",                       "label": "Непосредственный руководитель", "action": "approve", "sla_hours": 24},
  {"order": 2, "role_key": "field_user:addressee_person",      "label": "Адресат заявления",             "action": "approve", "sla_hours": 48}
]
```

---

### 15.5 Seed-данные

Все 4 типа заводятся через data-migration `apps/edo/internal_docs/migrations/0002_seed_mvp_types.py` на старте Фазы 1. Структура:

```python
TYPES = [
    {"code": "memo_free",          "name": "...", "field_schema": [...], "title_template": "...", "body_template": "...", "chain": [...]},
    {"code": "memo_overtime",      "name": "...", ...},
    {"code": "app_dayoff_workoff", "name": "...", ...},
    {"code": "app_free",           "name": "...", ...},
]

def forwards(apps, schema_editor):
    DocumentType = apps.get_model("internal_docs", "DocumentType")
    ApprovalChainTemplate = apps.get_model("internal_docs", "ApprovalChainTemplate")
    NumberSequence = apps.get_model("core", "NumberSequence")

    for spec in TYPES:
        seq, _ = NumberSequence.objects.get_or_create(
            code=f"internal_docs.{spec['code']}",
            defaults={"pattern": f"{spec['prefix']}-{{YYYY}}-{{####}}", "yearly_reset": True},
        )
        chain = ApprovalChainTemplate.objects.create(
            name=f"{spec['name']} — стандартная",
            steps=spec["chain"],
            is_default=True,
        )
        DocumentType.objects.create(
            code=spec["code"],
            name=spec["name"],
            category=spec["category"],
            icon=spec["icon"],
            field_schema=spec["field_schema"],
            title_template=spec["title_template"],
            body_template=spec["body_template"],
            numbering_sequence=seq,
            default_chain=chain,
            initiator_resolver=spec["initiator_resolver"],
            addressee_mode=spec["addressee_mode"],
            visibility=spec["visibility"],
            requires_drawn_signature=False,
        )
```

После успешного seed на dev-базе — пройти ручной smoke тест каждого типа (создание → отправка → approve → PDF).

---

**Следующий шаг:** старт Фазы 1. Порядок работы:
1. Расширить `OrgUnit.UnitType` (+ `SERVICE`, `SECTOR`), миграция + наполнение структуры Релесофта (и других компаний, если есть) в админке.
2. Добавить `User.org_unit`, `User.supervisor`, data-migration для маппинга legacy `User.department`.
3. Починить `TeamPerformanceView` под новый FK + тесты.
4. Завести модели `InternalDocFlowConfig`, `DocumentType`, `ApprovalChainTemplate`, `Document`, `ApprovalStep`, `DocumentAttachment` + миграции.
5. Сервис `ChainResolver` с резолверами из §3.4 + §15.0.
6. Сервис `body_renderer` (Django Template).
7. API CRUD + submit/approve/reject + permissions.
8. Seed 4 MVP-типов.
9. Фронт: «Мои документы» → wizard создания → страница документа.
10. Интеграция с `apps/notifications`, `apps/comments`, Playwright PDF.
11. Smoke-тесты.

Готов начинать с шага 1 — дай отмашку, или хочешь сперва что-то доуточнить в §15.
