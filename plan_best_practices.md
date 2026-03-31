# Bresler ERP — План заимствования лучших практик из Open Source ERP

> **Источники:** ERPNext, InvenTree (Django+DRF+React), Odoo CE
> **Цель:** Сделать Bresler ERP лучше, чем существующие open source ERP, взяв проверенные архитектурные паттерны и реализовав их на современном стеке.
> **Дата:** 2026-03-28

---

## Текущее состояние Bresler ERP

| Что есть | Статус |
|---|---|
| Заказы (CRUD, история, файлы, контракты) | Готово |
| Справочники (OrgUnit tree, контакты, оборудование и др.) | Готово |
| Устройства РЗА (каталог, параметры, компоненты, продукция) | Готово (Фаза 2) |
| ЭДО (реестр писем, шаблоны, конвертеры) | Готово (Фаза 3) |
| JWT-авторизация, модульный доступ (GroupProfile) | Готово |
| WebSocket (presence — кто смотрит заказ) | Готово |
| Celery (импорт компонентов из ProdUX) | Готово |
| Dashboard | Заглушка (карточки модулей, без аналитики) |
| Workflow (валидация переходов статусов) | Нет — статус меняется произвольно |
| Уведомления | Нет |
| Комментарии | Нет |
| Import/Export (CSV/Excel) | Нет |
| Отчёты и аналитика | Нет |

---

## Фаза 1 — Фундамент (2 недели)

### 1.1. Event System — шина событий

> **Источник:** InvenTree (`plugin/base/event/events.py`)
> **Почему первый:** Это фундамент для уведомлений, workflow, audit log и webhook. Без event system каждая подсистема будет изобретать свои сигналы.

**Суть:** Обобщённая система событий поверх Django signals. Любое значимое действие генерирует событие, на которое могут подписаться обработчики.

**Где будет полезна в Bresler ERP:**

| Событие | Кто генерирует | Кто подписывается |
|---|---|---|
| `order.created` | OrderService.create_order() | Уведомления → менеджерам отдела |
| `order.status_changed` | WorkflowMixin.transition() | Уведомления → менеджерам заказа; Audit log |
| `contract.payment_received` | ContractService.update() | Уведомления → бухгалтерии; Пересчёт статуса заказа |
| `order.ship_date_overdue` | Celery Beat (ежедневная проверка) | Уведомления → менеджерам; Dashboard (красная карточка) |
| `orgunit.updated` | OrgUnit.save() | Audit log; Обновление кеша |
| `letter.registered` | RegistryService | Уведомления → ответственным за ЭДО |
| `import.completed` | Celery task | Уведомления → пользователю, запустившему импорт |
| `component.synced` | ComponentService.sync_component() | Лог импорта |

**Реализация:**

```
backend/apps/core/
├── events.py          # EventRegistry, trigger_event(), @on_event() декоратор
├── signals.py         # Auto-events из post_save/post_delete (как InvenTree)
└── handlers/          # Обработчики событий по модулям
    ├── __init__.py
    └── notification_handlers.py
```

**Конкретный пример — сейчас vs после:**

Сейчас (order_service.py):
```python
def create_order(**kwargs) -> Order:
    if "order_number" not in kwargs:
        kwargs["order_number"] = get_next_order_number()
    return Order.objects.create(**kwargs)
    # Ничего больше не происходит. Менеджеры не узнают о новом заказе.
```

После:
```python
def create_order(**kwargs) -> Order:
    if "order_number" not in kwargs:
        kwargs["order_number"] = get_next_order_number()
    order = Order.objects.create(**kwargs)
    trigger_event("order.created", instance=order, user=kwargs.get("created_by"))
    return order

# В handlers/notification_handlers.py:
@on_event("order.created")
def notify_managers_on_new_order(instance, user, **kwargs):
    """Уведомить менеджеров отдела о новом заказе."""
    recipients = User.objects.filter(groups__groupprofile__allowed_modules__contains=["orders"])
    create_notification(
        recipients=recipients,
        title=f"Новый заказ #{instance.order_number}",
        message=f"Создан заказ для {instance.customer_org_unit}",
        target=instance,
    )
```

**Чек-лист:**
- [ ] `apps/core/events.py` — EventRegistry с trigger_event() и @on_event()
- [ ] `apps/core/signals.py` — автоматические события из post_save/post_delete
- [ ] Guard checks: не отправлять события при массовом импорте (как InvenTree)
- [ ] Обработчики выполняются асинхронно через Celery (не блокируют запрос)
- [ ] Логирование событий для отладки
- [ ] Тесты: проверить что trigger_event вызывает обработчики

---

### 1.2. Система уведомлений

> **Источник:** InvenTree (`common/notifications.py`, `NotificationMessage`, `NotificationEntry`)
> **Зависит от:** 1.1 Event System

**Суть:** Модель уведомлений с GenericFK (привязка к любому объекту), дедупликация (не слать одно и то же чаще раза в 24 часа), доставка через WebSocket (real-time) + email (отложенные).

**Где будет полезна в Bresler ERP:**

| Сценарий | Что получает пользователь | Канал |
|---|---|---|
| Создан заказ, где я менеджер | "Вы назначены менеджером заказа #1234" → клик ведёт на заказ | WebSocket + bell |
| Статус заказа изменился на "Отгружен" | "Заказ #1234 отгружен" | WebSocket + bell |
| Приближается дата отгрузки (за 3 дня) | "Заказ #1234: отгрузка через 3 дня" | WebSocket + email |
| Просрочена дата отгрузки | "Заказ #1234: просрочена отгрузка!" (красный) | WebSocket + email |
| Кто-то оставил комментарий к моему заказу | "Иванов И.И. прокомментировал заказ #1234" | WebSocket |
| Импорт компонентов завершён | "Импорт завершён: 45 создано, 12 без изменений" | WebSocket |
| Оплата по контракту изменилась | "Контракт #D-2026-001: оплачен аванс" | WebSocket |

**Реализация:**

Backend:
```
backend/apps/notifications/
├── models.py          # Notification (GenericFK), NotificationEntry (дедупликация)
├── consumers.py       # NotificationConsumer (WebSocket ws/notifications/)
├── services.py        # create_notification(), mark_read(), send_email_digest()
├── api/
│   ├── views.py       # NotificationViewSet (list, mark_read, mark_all_read, unread_count)
│   ├── serializers.py
│   └── urls.py
├── tasks.py           # Celery: check_deadlines(), send_email_digest()
└── tests/
```

Frontend:
```
frontend/src/
├── api/hooks/useNotifications.ts    # React Query: список, mark_read, unread_count
├── hooks/useNotificationSocket.ts   # WebSocket подключение
├── components/layout/
│   └── NotificationBell.tsx         # Bell icon + badge + dropdown в Header
└── features/notifications/
    └── NotificationsPage.tsx        # Полная страница всех уведомлений
```

**Конкретный пример — Header сейчас vs после:**

Сейчас (Header.tsx):
```tsx
<div className="flex items-center gap-3">
    <ThemeToggle />
    <span>{user.full_name}</span>
    <Button onClick={handleLogout}>Выход</Button>
</div>
```

После:
```tsx
<div className="flex items-center gap-3">
    <NotificationBell />   {/* Bell icon с красным badge "5" */}
    <ThemeToggle />
    <span>{user.full_name}</span>
    <Button onClick={handleLogout}>Выход</Button>
</div>
```

**Чек-лист:**
- [ ] Модель `Notification` (recipient, title, message, is_read, link, content_type, object_id, category, created_at)
- [ ] Модель `NotificationEntry` (key, uid, updated) для дедупликации
- [ ] `NotificationConsumer` — WebSocket consumer (ws/notifications/)
- [ ] API: list (с пагинацией), unread_count, mark_read, mark_all_read
- [ ] Celery Beat: ежедневная проверка дедлайнов (ship_date), email-дайджест
- [ ] Frontend: NotificationBell в Header, dropdown, страница уведомлений
- [ ] Интеграция с Event System (обработчики из 1.1)
- [ ] Тесты backend + frontend

---

### 1.3. Комментарии + Unified Timeline

> **Источник:** ERPNext (Comment + Activity Log объединены в timeline)
> **Зависит от:** 1.1 Event System (комментарий = событие)

**Суть:** Возможность оставить комментарий к любому объекту (заказ, контракт, организация, письмо). Комментарии + история изменений (simple_history) объединяются в единый Timeline.

**Где будет полезна в Bresler ERP:**

Сейчас в OrderDetailPage вкладка "История" показывает только технические изменения полей из simple_history. Нет возможности обсудить заказ — коллеги звонят/пишут в мессенджеры, контекст теряется.

| Запись в Timeline | Источник | Иконка |
|---|---|---|
| "Иванов И.И.: Клиент просит ускорить поставку, свяжитесь с логистикой" | Comment |💬 |
| "Статус изменён: Новый → Договор (Петров П.П.)" | simple_history | 🔄 |
| "Добавлен файл: Спецификация_v2.pdf" | simple_history | 📎 |
| "Менеджер добавлен: Сидоров С.С." | simple_history | 👤 |
| "Контракт: аванс оплачен (30%)" | simple_history | 💰 |
| "Сидоров С.С.: @Иванов проверьте КП перед отправкой" | Comment | 💬 |

**Реализация:**

```
backend/apps/comments/
├── models.py          # Comment (BaseModel + GenericFK, author, text, mentions)
├── api/
│   ├── views.py       # CommentViewSet (create, list, update, delete)
│   ├── serializers.py
│   └── urls.py
└── tests/
```

```
frontend/src/components/shared/
├── Timeline.tsx           # Unified: comments + history entries, sorted by date
├── CommentForm.tsx        # Textarea с кнопкой "Отправить", @mentions
└── TimelineEntry.tsx      # Рендер одной записи (комментарий или изменение)
```

**Конкретный пример — OrderDetailPage:**

Сейчас: вкладка "История" — сухая таблица из simple_history (поле, старое значение, новое значение).

После: вкладка "Обсуждение" — живая лента:
```
─── 28 марта 2026, 14:30 ────────────────────
🔄 Петров П.П. изменил статус: Новый → Договор

─── 28 марта 2026, 15:00 ────────────────────
💬 Иванов И.И.:
   Договор подписан, скан в файлах. @Петров начинайте производство.

─── 28 марта 2026, 15:05 ────────────────────
📎 Иванов И.И. добавил файл: Договор_1234_скан.pdf

─── 28 марта 2026, 16:00 ────────────────────
💬 Петров П.П.:
   Принято, запускаю в производство. Срок — 2 недели.

─── 28 марта 2026, 16:01 ────────────────────
🔄 Петров П.П. изменил статус: Договор → Производство
```

**Чек-лист:**
- [ ] Модель `Comment` (GenericFK через ContentType, author FK→User, text, created_at)
- [ ] API: CRUD comments с фильтрацией по content_type + object_id
- [ ] Frontend: Timeline компонент (объединяет comments + simple_history)
- [ ] Frontend: CommentForm (textarea, submit, будущее — @mentions)
- [ ] Интеграция в OrderDetailPage (заменить вкладку "История" на Timeline)
- [ ] Event: `comment.created` → уведомление менеджерам заказа
- [ ] Тесты

---

## Фаза 2 — Данные и документы (2-3 недели)

### 2.1. Export данных (CSV / Excel)

> **Источник:** InvenTree (DataExportMixin), ERPNext (экспорт любого списка)
> **Зависит от:** ничего

**Суть:** Кнопка "Экспорт" в любой таблице системы. Экспортируется то, что видит пользователь (с учётом текущих фильтров).

**Где будет полезна в Bresler ERP:**

| Кто | Что экспортирует | Зачем |
|---|---|---|
| Менеджер ОТМ | Заказы за квартал (с фильтром по статусу) | Отчёт руководителю |
| Бухгалтер | Контракты с суммами | Сверка оплат |
| Менеджер | Контакты заказчика | Рассылка/обзвон |
| Руководитель | Организации-заказчики | Анализ клиентской базы |
| Инженер | Каталог устройств РЗА | Работа в Excel офлайн |

**Реализация:**

Backend — mixin для любого ViewSet:
```python
# apps/core/mixins/export.py
class ExportMixin:
    """Добавляет ?export=csv и ?export=xlsx к любому ViewSet."""
    export_fields = None  # Если None — все поля сериализатора
    export_filename = None  # Имя файла (иначе — model._meta.verbose_name_plural)

    @action(detail=False, methods=["get"])
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())  # С текущими фильтрами!
        format = request.query_params.get("format", "xlsx")
        ...
```

Применение — одна строка в существующем ViewSet:
```python
class OrderViewSet(ExportMixin, ModelViewSet):
    export_fields = ["order_number", "status", "customer_org_unit__name", "ship_date", "contract__amount"]
    export_filename = "orders"
```

Frontend — кнопка в DataTable:
```tsx
// В компоненте DataTable.tsx — рядом с пагинацией
<DropdownMenu>
  <DropdownMenuTrigger><Download /> Экспорт</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => exportData("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
    <DropdownMenuItem onClick={() => exportData("csv")}>CSV (.csv)</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Чек-лист:**
- [ ] `apps/core/mixins/export.py` — ExportMixin (CSV + XLSX через openpyxl)
- [ ] Поддержка текущих фильтров (экспорт = то что видишь)
- [ ] Поддержка вложенных полей (customer_org_unit__name)
- [ ] Русские заголовки колонок (из verbose_name)
- [ ] Применить к: OrderViewSet, OrgUnitViewSet, ContactViewSet, DeviceRZAViewSet
- [ ] Frontend: кнопка "Экспорт" в DataTable (скачивание файла)
- [ ] Добавить `openpyxl` в requirements/base.txt
- [ ] Тесты: экспорт с фильтрами, пустой результат, большие данные

---

### 2.2. Import данных (CSV / Excel)

> **Источник:** InvenTree (`importer/models.py` — DataImportSession, DataImportColumnMap, DataImportRow)
> **Зависит от:** 2.1 Export (тот же формат), 1.1 Event System (событие import.completed)

**Суть:** Пошаговый wizard для импорта данных из CSV/Excel. Загрузка → автоматический маппинг колонок → предпросмотр и валидация → применение.

**Где будет полезна в Bresler ERP:**

| Сценарий | Что импортируют | Объём |
|---|---|---|
| Миграция из старой ERP | Организации (OrgUnit) | ~5000 записей |
| Миграция из старой ERP | Контакты | ~3000 записей |
| Обновление справочника | Оборудование, виды работ | ~200 записей |
| Загрузка из Excel клиента | Объекты (Facility) | ~100 записей |
| Обновление каталога | Устройства РЗА | ~500 записей |
| Массовое создание | Заказы из тендерной таблицы | ~50 записей |

**Pipeline (как в InvenTree, адаптировано):**

```
UPLOAD → MAPPING → VALIDATION → PROCESSING → COMPLETE
  │         │           │            │           │
  │         │           │            │           └─ Результат: N создано, M ошибок
  │         │           │            └─ Celery task: bulk_create / bulk_update
  │         │           └─ Dry-run через DRF serializer модели
  │         └─ Автоматический маппинг (column name → field verbose_name)
  └─ Загрузка CSV/XLSX, извлечение колонок
```

**Реализация:**

```
backend/apps/importer/
├── models.py          # ImportSession, ImportColumnMap, ImportRow
├── services.py        # ImportService (parse_file, auto_map, validate, apply)
├── tasks.py           # Celery: process_import_session()
├── api/
│   ├── views.py       # ImportSessionViewSet (create, accept_mapping, validate, apply)
│   ├── serializers.py
│   └── urls.py
└── tests/
```

```
frontend/src/features/import/
├── ImportWizard.tsx        # Stepper: Upload → Map → Preview → Result
├── ColumnMapper.tsx        # Drag-and-drop маппинг колонок
├── ImportPreview.tsx       # Таблица с предпросмотром + ошибки (красные строки)
└── ImportResult.tsx        # Итог: N создано, M обновлено, K ошибок
```

**Конкретный пример — импорт организаций:**

1. Пользователь загружает Excel от клиента с колонками: "Наименование", "ИНН", "Адрес", "Город"
2. Система автоматически маппит: "Наименование" → name, "ИНН" → inn, "Адрес" → address
3. "Город" не замаплен автоматически — пользователь выбирает из dropdown: city → City (lookup по name)
4. Dry-run: 48 из 50 строк валидны, 2 ошибки (дубликат ИНН, пустое наименование)
5. Пользователь исправляет или пропускает ошибочные строки
6. Apply: 48 организаций создано, уведомление "Импорт завершён"

**Чек-лист:**
- [ ] Модели: ImportSession (file, status, model_name, user), ImportColumnMap, ImportRow
- [ ] Сервис: парсинг CSV/XLSX, автомаппинг по verbose_name (case-insensitive)
- [ ] Валидация через DRF serializer целевой модели (dry-run)
- [ ] Celery task для обработки больших файлов (>100 строк)
- [ ] API: upload, get_mapping, update_mapping, validate (dry-run), apply
- [ ] Поддержка моделей: OrgUnit, Contact, Equipment, TypeOfWork, Facility
- [ ] Frontend: ImportWizard со stepper, preview с ошибками, результат
- [ ] Event: `import.completed` → уведомление пользователю
- [ ] Тесты: валидный файл, ошибки валидации, дубликаты, пустой файл

---

### 2.3. Naming Series — универсальная автонумерация

> **Источник:** ERPNext (Naming Series), Odoo (IR Sequence)
> **Зависит от:** ничего

**Суть:** Единый механизм автонумерации для всех типов документов. Настраиваемые шаблоны с годом, счётчиком, префиксом.

**Где будет полезна в Bresler ERP:**

| Документ | Сейчас | После (Naming Series) |
|---|---|---|
| Order.order_number | `MAX(order_number) + 1` → 1, 2, 3... | `ORD-2026-0001` (настраиваемый) |
| Contract.contract_number | Ручной ввод (unique) | `ДОГ-2026-0001` (автогенерация) |
| EDO Letter | Sequence из PostgreSQL | `ИСХ-2026-0001` / `ВХ-2026-0001` |
| Будущее: Invoice | — | `СЧ-2026-0001` |
| Будущее: Act | — | `АКТ-2026-0001` |

**Реализация:**

```python
# apps/core/models.py (добавить)
class NumberSequence(BaseModel):
    """Настраиваемая последовательность нумерации документов."""
    name = models.CharField(max_length=50, unique=True)           # "order", "contract", "letter_out"
    prefix = models.CharField(max_length=20)                       # "ORD", "ДОГ", "ИСХ"
    pattern = models.CharField(max_length=100)                     # "{prefix}-{YYYY}-{####}"
    current_value = models.PositiveIntegerField(default=0)
    reset_period = models.CharField(choices=[("yearly","Ежегодно"),("never","Никогда")], default="yearly")

    def generate(self) -> str:
        """Атомарная генерация следующего номера (F-expression для concurrency)."""
        ...
```

**Конкретный пример — рефакторинг order_service.py:**

Сейчас:
```python
def get_next_order_number() -> int:
    max_number = Order.objects.aggregate(max_num=Max("order_number"))["max_num"]
    return (max_number or 0) + 1
    # Проблемы: race condition при одновременном создании, нет форматирования
```

После:
```python
def get_next_order_number() -> str:
    return NamingService.generate("order")
    # Возвращает "ORD-2026-0042", атомарно, без race condition
    # Шаблон настраивается через админку
```

**Чек-лист:**
- [ ] Модель `NumberSequence` в apps/core/
- [ ] `NamingService.generate(name)` — атомарная генерация (F-expression + select_for_update)
- [ ] Поддержка шаблонов: {prefix}, {YYYY}, {YY}, {MM}, {####}, {######}
- [ ] Reset counter по периоду (ежегодно / никогда)
- [ ] Рефакторинг: Order.order_number → CharField, использовать NamingService
- [ ] Рефакторинг: Contract.contract_number → автогенерация
- [ ] Рефакторинг: EDO Letter → через NamingService вместо raw sequence
- [ ] Миграция данных: конвертировать существующие номера
- [ ] API: CRUD для NumberSequence (настройка через админку)
- [ ] Тесты: concurrency (параллельная генерация), reset, форматирование

---

## Фаза 3 — Бизнес-логика (2-3 недели)

### 3.1. Workflow Engine — формальные бизнес-процессы

> **Источник:** ERPNext (Workflow + WorkflowState + WorkflowTransition), InvenTree (TransitionMixin)
> **Зависит от:** 1.1 Event System, 1.2 Notifications

**Суть:** Формальное описание допустимых переходов между состояниями документа. Кто может переводить, при каких условиях, какие действия выполняются при переходе.

**Где будет полезна в Bresler ERP:**

**Проблема сейчас:** Статус заказа — простое CharField с choices. Любой пользователь может поставить любой статус. Нет валидации "из Нового можно только в Договор", нет автоматических действий.

**Workflow заказа (Order):**

```
    ┌─────────┐    подписан     ┌──────────┐   запущен    ┌──────────────┐
    │  Новый  │ ──────────────→ │ Договор  │ ──────────→  │ Производство │
    │  (NEW)  │    договор      │(CONTRACT)│  в работу    │ (PRODUCTION) │
    └─────────┘                 └──────────┘              └──────────────┘
         │                                                       │
         │ отмена                                          собран │
         ↓                                                       ↓
    ┌─────────┐                                           ┌──────────┐
    │  Архив  │ ←──────────── любой статус ───────────────→│  Собран  │
    │(ARCHIVE)│    (только admin/руководитель)             │(ASSEMBLED│
    └─────────┘                                           └──────────┘
                                                                │
                                                         отгрузка │
                                                                ↓
                                                          ┌──────────┐
                                                          │ Отгружен │
                                                          │ (SHIPPED)│
                                                          └──────────┘
                                                                │
                                                          архив │
                                                                ↓
                                                          ┌──────────┐
                                                          │  Архив   │
                                                          │(ARCHIVED)│
                                                          └──────────┘
```

**Workflow контракта (Contract.payment_status):**

```
    Не оплачен → Аванс оплачен → Промежуточная → Полностью оплачен
        │                                              │
        └──────────── Полностью оплачен ──────────────→┘  (возможна прямая оплата)
```

**Переходы с условиями и действиями:**

| Переход | Кто может | Условие | Действие |
|---|---|---|---|
| Новый → Договор | менеджер, admin | contract существует | Уведомить бухгалтерию |
| Договор → Производство | менеджер, admin | contract.status != not_paid | Уведомить производство |
| Производство → Собран | менеджер, admin | — | Уведомить логистику |
| Собран → Отгружен | менеджер, admin | ship_date заполнена | Уведомить клиента (будущее) |
| Любой → Архив | admin | — | Записать причину в комментарий |

**Реализация:**

```
backend/apps/core/workflow/
├── models.py          # Workflow, WorkflowState, WorkflowTransition
├── mixins.py          # WorkflowMixin — добавить к любой модели
├── services.py        # WorkflowService.transition(instance, new_state, user)
├── exceptions.py      # TransitionNotAllowed, ConditionNotMet
└── tests/
```

```python
# Пример использования в Order:
class Order(WorkflowMixin, BaseModel):
    WORKFLOW_FIELD = "status"

# В сервисе:
WorkflowService.transition(order, "D", user=request.user)
# → Проверит: текущий статус "N", переход "N"→"D" разрешён
# → Проверит: user имеет нужную роль
# → Проверит: условие (contract существует)
# → Выполнит переход
# → trigger_event("order.status_changed", ...)
# → Уведомление бухгалтерии
```

**Frontend — кнопки вместо dropdown:**

Сейчас: `<Select>` со всеми статусами — пользователь может выбрать любой.

После:
```tsx
// В OrderDetailPage:
<StatusBadge status={order.status} />
<div className="flex gap-2 mt-2">
    {/* Только допустимые переходы для текущего пользователя */}
    {availableTransitions.map(t => (
        <Button key={t.to_state} variant="outline" onClick={() => transition(t.to_state)}>
            {t.label}  {/* "Перевести в Договор", "Архивировать" */}
        </Button>
    ))}
</div>
```

**Чек-лист:**
- [ ] Модели: Workflow, WorkflowState (name, is_initial, is_final, color), WorkflowTransition (from_state, to_state, allowed_roles, condition, action)
- [ ] WorkflowMixin: get_available_transitions(user), transition(new_state, user)
- [ ] WorkflowService: валидация перехода, проверка ролей и условий
- [ ] Исключения: TransitionNotAllowed (403), ConditionNotMet (400)
- [ ] Fixtures: workflow для Order и Contract
- [ ] API: GET /api/orders/{id}/transitions/ — доступные переходы
- [ ] API: POST /api/orders/{id}/transition/ {state: "D"} — выполнить переход
- [ ] Интеграция с Event System → Notifications
- [ ] Frontend: кнопки переходов вместо Select, StatusBadge с цветами
- [ ] Тесты: все переходы, запрещённые переходы, проверка ролей

---

### 3.2. Linked Documents — связи между документами

> **Источник:** ERPNext (links в DocType), InvenTree (GenericFK cross-references)
> **Зависит от:** 1.3 Comments (GenericFK паттерн уже реализован)

**Суть:** На странице любого документа видны все связанные документы другого типа. Заказ → Контракт, Файлы, Письма ЭДО, связанные заказы — всё в одном месте.

**Где будет полезна в Bresler ERP:**

Сейчас связи жёстко закодированы (Order.contract, Order.related_orders). Нет универсального механизма. Когда появятся акты, счета, накладные — для каждой связи придётся писать отдельный код.

| Документ | Связанные |
|---|---|
| Заказ #1234 | Контракт ДОГ-2026-0042, 3 файла, Письмо ИСХ-2026-015, Заказ #1235 (дополнительный), Устройство МП РЗА-01 |
| Контракт ДОГ-2026-0042 | Заказ #1234, Файл "Скан_договора.pdf" |
| Организация "Россети" | 15 заказов, 8 контактов, 3 объекта |
| Письмо ИСХ-2026-015 | Заказ #1234, Контакт "Иванов И.И." |

**Реализация:**

```python
# apps/core/models.py
class DocumentLink(BaseModel):
    """Универсальная связь между любыми двумя объектами."""
    source_type = models.ForeignKey(ContentType, related_name="source_links", ...)
    source_id = models.PositiveIntegerField()
    source = GenericForeignKey("source_type", "source_id")

    target_type = models.ForeignKey(ContentType, related_name="target_links", ...)
    target_id = models.PositiveIntegerField()
    target = GenericForeignKey("target_type", "target_id")

    link_type = models.CharField(max_length=50, blank=True)  # "related", "parent", "reference"
```

```tsx
// frontend/src/components/shared/LinkedDocuments.tsx
// Секция в карточке документа:
// ┌─ Связанные документы ────────────────────────┐
// │ 📋 Контракт ДОГ-2026-0042  (Не оплачен)     │
// │ 📁 Спецификация_v2.pdf  (1.2 MB)             │
// │ 📨 Письмо ИСХ-2026-015  (Отправлено)         │
// │ 📋 Заказ #1235  (Производство)                │
// │                                               │
// │ [+ Добавить связь]                            │
// └───────────────────────────────────────────────┘
```

**Чек-лист:**
- [ ] Модель `DocumentLink` с двойным GenericFK (source + target)
- [ ] API: GET /api/links/?source_type=order&source_id=123
- [ ] API: POST /api/links/ (создать связь)
- [ ] Frontend: LinkedDocuments компонент
- [ ] Интеграция в OrderDetailPage, OrgUnitPage
- [ ] Тесты

---

## Фаза 4 — Аналитика (2-3 недели)

### 4.1. Система отчётов

> **Источник:** ERPNext (Query Report + Script Report), InvenTree (ReportTemplate)
> **Зависит от:** 2.1 Export (экспорт результатов отчёта)

**Суть:** Готовые бизнес-отчёты с параметрами (фильтрами), таблицей результатов и графиками. Каждый отчёт = Python-класс с методом get_data().

**Готовые отчёты для Bresler ERP:**

| Отчёт | Параметры | Колонки | График |
|---|---|---|---|
| **Заказы по статусам** | Период | Статус, количество, % | Pie chart |
| **Заказы по менеджерам** | Период, статус | Менеджер, кол-во заказов, сумма контрактов | Bar chart |
| **Заказы по заказчикам** | Период, top N | Заказчик, кол-во, сумма | Bar chart |
| **Динамика заказов** | Период, группировка (мес/кв/год) | Период, новые, завершённые, в работе | Line chart |
| **Просроченные заказы** | На дату | Номер, заказчик, менеджер, ship_date, дней просрочки | Таблица (красный) |
| **Оплата контрактов** | Период | Контракт, сумма, статус оплаты, % оплачено | Stacked bar |
| **Реестр организаций** | Роль, страна | Название, ИНН, роль, кол-во заказов | Таблица |
| **Активность пользователей** | Период | Пользователь, заказов создано, комментариев | Bar chart |

**Реализация:**

```
backend/apps/reports/
├── base.py            # BaseReport (name, filters, columns, get_data(), get_chart_data())
├── registry.py        # ReportRegistry — автообнаружение отчётов
├── reports/
│   ├── orders_by_status.py
│   ├── orders_by_manager.py
│   ├── orders_by_customer.py
│   ├── orders_timeline.py
│   ├── overdue_orders.py
│   └── contract_payments.py
├── api/
│   ├── views.py       # ReportViewSet: list, execute (GET /api/reports/{name}/?params)
│   ├── serializers.py
│   └── urls.py
└── tests/
```

```
frontend/src/features/reports/
├── ReportsPage.tsx        # Список доступных отчётов (карточки)
├── ReportView.tsx         # Рендер отчёта: фильтры + таблица + график
├── ReportFilters.tsx      # Динамические фильтры из метаданных отчёта
├── ReportChart.tsx        # Recharts: pie, bar, line (по типу из отчёта)
└── ReportTable.tsx        # TanStack Table с данными отчёта
```

**Конкретный пример — "Заказы по статусам":**

```python
class OrdersByStatusReport(BaseReport):
    name = "orders_by_status"
    title = "Заказы по статусам"
    filters = [
        DateRangeFilter("period", label="Период"),
    ]
    columns = [
        Column("status", "Статус", type="badge"),
        Column("count", "Количество", type="number"),
        Column("total_amount", "Сумма контрактов", type="currency"),
        Column("percentage", "Доля", type="percent"),
    ]
    chart_type = "pie"
    chart_value_field = "count"
    chart_label_field = "status"

    def get_data(self, filters):
        qs = Order.objects.all()
        if filters.get("period"):
            qs = qs.filter(created_at__range=filters["period"])
        return (
            qs.values("status")
            .annotate(count=Count("id"), total_amount=Sum("contract__amount"))
            .order_by("-count")
        )
```

**Чек-лист:**
- [ ] BaseReport (name, title, filters, columns, get_data(), get_chart_data())
- [ ] ReportRegistry с автообнаружением из apps/reports/reports/
- [ ] 6+ готовых отчётов (см. таблицу выше)
- [ ] API: GET /api/reports/ (список), GET /api/reports/{name}/?filters (данные)
- [ ] Интеграция с ExportMixin — экспорт результатов отчёта в Excel
- [ ] Frontend: ReportsPage, ReportView с динамическими фильтрами
- [ ] Frontend: графики через Recharts (pie, bar, line)
- [ ] Добавить `recharts` в package.json
- [ ] Права доступа: GroupProfile.allowed_modules includes "reports"
- [ ] Тесты: каждый отчёт с разными фильтрами

---

### 4.2. Dashboard — аналитическая главная страница

> **Источник:** ERPNext (Number Card + Chart + Shortcut), Odoo (Dashboard)
> **Зависит от:** 4.1 Reports (данные для виджетов)

**Суть:** Заменить текущую заглушку (карточки модулей) на полноценный dashboard с метриками, графиками и быстрыми действиями.

**Что видит пользователь:**

```
┌─────────────────────────────────────────────────────────────┐
│  Добрый день, Сергей!                                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │    42    │  │    12    │  │    3     │  │  ₽15.2M  │   │
│  │  Всего   │  │ В работе │  │Просрочено│  │  Сумма   │   │
│  │ заказов  │  │          │  │  (!)     │  │контрактов│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌────────────────────────────┐  │
│  │ Заказы по статусам   │  │ Динамика за 12 месяцев     │  │
│  │     [PIE CHART]      │  │     [LINE CHART]           │  │
│  │  ● Новый: 8          │  │  📈 Тренд: +15%           │  │
│  │  ● Договор: 12       │  │                            │  │
│  │  ● Производство: 15  │  │                            │  │
│  │  ● Собран: 4         │  │                            │  │
│  │  ● Отгружен: 3       │  │                            │  │
│  └──────────────────────┘  └────────────────────────────┘  │
│                                                             │
│  Быстрые действия                          Мои заказы      │
│  [+ Новый заказ] [📨 Реестр писем]         #1234 Договор   │
│  [📋 Отчёты] [📥 Импорт]                  #1230 Производ.  │
│                                             #1228 Собран    │
└─────────────────────────────────────────────────────────────┘
```

**Реализация:**

Backend:
```python
# apps/reports/api/views.py — добавить endpoint
class DashboardView(APIView):
    """Агрегированные данные для dashboard."""
    def get(self, request):
        return Response({
            "total_orders": Order.objects.count(),
            "in_progress": Order.objects.filter(status__in=["D","P","C"]).count(),
            "overdue": Order.objects.filter(ship_date__lt=date.today(), status__in=["N","D","P","C"]).count(),
            "total_contract_amount": Contract.objects.aggregate(total=Sum("amount"))["total"] or 0,
            "orders_by_status": [...],          # Для pie chart
            "orders_timeline": [...],           # Для line chart (12 месяцев)
            "my_orders": [...],                 # Заказы текущего пользователя
            "recent_notifications": [...],      # Последние 5 уведомлений
        })
```

Frontend:
```
frontend/src/features/dashboard/
├── DashboardPage.tsx      # Рефакторинг: метрики + графики + действия
├── NumberCard.tsx          # Карточка с числом и label
├── StatusPieChart.tsx      # Recharts PieChart
├── OrdersTimeline.tsx      # Recharts LineChart
└── MyOrdersList.tsx        # Список моих заказов (быстрый доступ)
```

**Чек-лист:**
- [ ] Backend: DashboardView с агрегированными данными
- [ ] Frontend: NumberCard компонент (число + label + цвет + иконка)
- [ ] Frontend: StatusPieChart (заказы по статусам)
- [ ] Frontend: OrdersTimeline (динамика за 12 месяцев)
- [ ] Frontend: MyOrdersList (заказы текущего пользователя)
- [ ] Рефакторинг DashboardPage.tsx (заменить заглушку)
- [ ] Красная подсветка для просроченных (overdue > 0)
- [ ] Кеширование данных dashboard (Redis, 5 мин TTL)
- [ ] Адаптив: мобильная версия (карточки в одну колонку)
- [ ] Тесты backend

---

## Фаза 5 — Metadata и автоматизация (1-2 недели, бонус)

### 5.1. Metadata-driven фильтры

> **Источник:** ERPNext (автогенерация фильтров из DocType), Odoo (search view)
> **Зависит от:** ничего

**Суть:** API endpoint возвращает описание полей модели (тип, label, choices). Frontend автоматически строит фильтры.

Сейчас фильтры пишутся вручную в каждом FilterSet (backend) и в каждой странице (frontend). При добавлении нового поля нужно обновлять в 3 местах.

**Реализация:**

```python
# API: GET /api/meta/orders/
{
    "fields": [
        {"name": "status", "type": "choice", "label": "Статус", "choices": [["N","Новый"],...]},
        {"name": "customer_org_unit", "type": "foreign_key", "label": "Заказчик", "endpoint": "/api/directory/orgunits/"},
        {"name": "ship_date", "type": "date", "label": "Дата отгрузки"},
        {"name": "managers", "type": "many_to_many", "label": "Менеджеры", "endpoint": "/api/users/"},
    ],
    "default_filters": ["status", "customer_org_unit", "ship_date"],
    "search_fields": ["order_number", "note", "customer_org_unit__name"],
}
```

```tsx
// frontend/src/components/shared/AutoFilters.tsx
// Принимает метаданные и рендерит фильтры автоматически:
// choice → Select, date → DatePicker, foreign_key → SearchableSelect, text → Input
<AutoFilters endpoint="/api/meta/orders/" onChange={setFilters} />
```

**Чек-лист:**
- [ ] Mixin `MetadataMixin` для ViewSet — endpoint /meta/ из модели
- [ ] Автоизвлечение: type, label, choices, related endpoint
- [ ] Frontend: AutoFilters компонент
- [ ] Применить к OrdersPage, OrgUnitPage (остальные — ReferenceTablePage уже простые)
- [ ] Тесты

---

## Фаза 6 — Личный кабинет (1-2 недели)

### 6.1. Модернизация ProfilePage

> **Источник:** Odoo (My Activities, User Preferences), ERPNext (User Settings, To Do), InvenTree (Notification Settings)
> **Зависит от:** 1.2 Notifications, 4.1 Reports, 4.2 Dashboard

**Суть:** Превратить личный кабинет из простой формы редактирования профиля в полноценный рабочий стол пользователя.

**Проблема сейчас:** ProfilePage показывает "Всего заказов" (общие, не личные) и "Последние заказы" (тоже все, не свои). Нет настроек уведомлений, нет ленты активности, нет загрузки аватара.

**Что добавить:**

| Компонент | Источник | Описание |
|---|---|---|
| **Мои заказы** | Odoo (My Activities) | Только заказы, где пользователь — менеджер. Фильтр по статусу. Количество: в работе, просрочено |
| **Лента активности** | ERPNext (Activity Timeline) | "Вы изменили статус заказа #1234", "Вам оставили комментарий", "Вы назначены менеджером" |
| **Настройки уведомлений** | InvenTree (NotificationSettings) | Чекбоксы: получать уведомления о новых заказах (да/нет), о комментариях, о дедлайнах; канал: bell / email / оба |
| **Avatar upload** | Odoo, ERPNext | Поле `avatar` уже есть в модели User — добавить UI загрузки с превью |
| **Смена пароля** | Все три | Форма: текущий пароль → новый → подтверждение |
| **Quick stats** | Odoo Dashboard | Персональные метрики: мои заказы по статусам, непрочитанные уведомления, мои комментарии за неделю |

**Макет ProfilePage после модернизации:**

```
┌─────────────────────────────────────────────────────────────┐
│  [Avatar]  Васильев Сергей Андреевич                        │
│            Менеджер ОТМ · Группа: otm                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │     8    │  │     3    │  │     1    │  │     5    │   │
│  │Мои заказы│  │ В работе │  │Просрочено│  │Непрочит. │   │
│  │          │  │          │  │  (!)     │  │уведомл.  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  Tabs: [Мои заказы] [Активность] [Профиль] [Настройки]     │
│                                                             │
│  Мои заказы (где я менеджер):                               │
│  #15302  Собран     ООО "Россети"     отгрузка: 01.04.2026 │
│  #15298  Договор    АО "МРСК"         отгрузка: 15.04.2026 │
│  #15290  Производ.  ПАО "ФСК ЕЭС"    отгрузка: 20.04.2026 │
│                                                             │
│  Активность (последние действия):                           │
│  🔄 Вы изменили статус заказа #15302: Производство → Собран │
│  💬 Иванов И.И. прокомментировал заказ #15302               │
│  📋 Вы создали заказ #15310                                 │
│  👤 Вы назначены менеджером заказа #15298                    │
└─────────────────────────────────────────────────────────────┘
```

**Реализация:**

Backend:
```
backend/apps/users/
├── api/
│   ├── views.py       # + MyOrdersView, ActivityFeedView, ChangePasswordView
│   └── serializers.py # + ChangePasswordSerializer, NotificationSettingsSerializer
└── models.py          # + UserSettings (notification preferences — JSONField или отдельная модель)
```

Frontend:
```
frontend/src/features/profile/
├── ProfilePage.tsx        # Рефакторинг: tabs + quick stats
├── MyOrdersTab.tsx        # Мои заказы с фильтрами
├── ActivityTab.tsx         # Лента активности
├── ProfileTab.tsx          # Форма редактирования + avatar upload
├── SettingsTab.tsx         # Настройки уведомлений + смена пароля
└── AvatarUpload.tsx        # Компонент загрузки аватара
```

**Чек-лист:**
- [ ] Backend: endpoint "мои заказы" (фильтр managers=request.user)
- [ ] Backend: endpoint "моя активность" (из simple_history + notifications)
- [ ] Backend: ChangePasswordView (current_password, new_password)
- [ ] Backend: UserSettings модель (notification preferences)
- [ ] Backend: Avatar upload endpoint
- [ ] Frontend: MyOrdersTab — таблица заказов с фильтром по статусу
- [ ] Frontend: ActivityTab — лента из уведомлений + истории
- [ ] Frontend: SettingsTab — чекбоксы уведомлений + форма смены пароля
- [ ] Frontend: AvatarUpload — drag-and-drop + preview
- [ ] Frontend: Quick stats (Number Cards с персональными метриками)
- [ ] Тесты

---

## Сводная таблица

| # | Фича | Источник | Зависит от | Сложность | Срок |
|---|---|---|---|---|---|
| 1.1 | Event System | InvenTree | — | Средняя | 2-3 дня |
| 1.2 | Уведомления | InvenTree | 1.1 | Высокая | 4-5 дней |
| 1.3 | Комментарии + Timeline | ERPNext | 1.1 | Средняя | 3-4 дня |
| 2.1 | Export (CSV/Excel) | InvenTree | — | Низкая | 2-3 дня |
| 2.2 | Import (CSV/Excel) | InvenTree | 2.1, 1.1 | Высокая | 5-6 дней |
| 2.3 | Naming Series | ERPNext+Odoo | — | Низкая | 2-3 дня |
| 3.1 | Workflow Engine | ERPNext | 1.1, 1.2 | Высокая | 5-6 дней |
| 3.2 | Linked Documents | ERPNext | 1.3 | Средняя | 3-4 дня |
| 4.1 | Отчёты | ERPNext | 2.1 | Высокая | 5-6 дней |
| 4.2 | Dashboard | ERPNext+Odoo | 4.1 | Средняя | 3-4 дня |
| 5.1 | Metadata-driven фильтры | ERPNext+Odoo | — | Низкая | 2-3 дня |
| 6.1 | Модернизация ProfilePage | Odoo+ERPNext+InvenTree | 1.2, 4.1, 4.2 | Средняя | 4-5 дней |
| | | | | **ИТОГО** | **~8-11 недель** |

---

## Конкурентные преимущества после реализации

| Возможность | ERPNext | InvenTree | Odoo CE | **Bresler ERP (после)** |
|---|---|---|---|---|
| Современный UI (React+TS) | ❌ jQuery | ✅ React | ❌ OWL/jQuery | ✅ React 19 + shadcn |
| TypeScript strict | ❌ | ✅ | ❌ | ✅ |
| OpenAPI документация | ❌ | ✅ | ❌ | ✅ drf-spectacular |
| Workflow engine | ✅ | ❌ | ✅ | ✅ (с UI кнопками) |
| Notifications (real-time) | ✅ | ✅ | ✅ | ✅ WebSocket + email |
| Comments + Timeline | ✅ | ❌ | ✅ | ✅ Unified |
| Import/Export | ✅ | ✅ | ✅ | ✅ Session-based wizard |
| Reports + Charts | ✅ | ✅ PDF | ✅ | ✅ Recharts + TanStack |
| Dashboard | ✅ | ❌ | ✅ | ✅ Number Cards + Charts |
| Naming Series | ✅ | ❌ | ✅ IR Sequence | ✅ |
| Linked Documents | ✅ | ❌ | ✅ | ✅ GenericFK |
| Event System | ❌ | ✅ | ✅ signals | ✅ |
| Нечёткий поиск (trigram) | ❌ LIKE | ❌ | ❌ | ✅ PostgreSQL |
| Tree (Materialized Path) | ❌ Nested Set | ❌ | ❌ Nested Set | ✅ treebeard |
| Docker dev+prod | ❌ Bench | ✅ | ❌ | ✅ |
| User Profile (activity, settings) | ✅ | ❌ | ✅ | ✅ Quick stats + activity feed |
| MyPy strict | ❌ | ❌ | ❌ | ✅ |

**Итог:** После реализации всех фаз Bresler ERP будет иметь функциональность на уровне зрелых ERP (workflow, reports, notifications, import/export), но на значительно более современном и типобезопасном стеке.
