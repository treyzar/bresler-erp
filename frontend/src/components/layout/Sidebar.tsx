import { useAuthStore } from "@/stores/useAuthStore"
import { useUIStore } from "@/stores/useUIStore"
import { cn } from "@/lib/utils"
import { type NavItem, SidebarNavItem } from "./SidebarNavItem"

type SubItem = NavItem & {
  module?: string
  /** Если задана, пункт виден только пользователям этой группы (или одной из, если массив). */
  group?: string | string[]
}

type NavItemWithModule = NavItem & {
  module?: string
  group?: string | string[]
  requireAccess?: "dashboard"
  subItems?: SubItem[]
}

const navItems: NavItemWithModule[] = [
  { to: "/dashboard", label: "Главная" },
  {
    to: "/orders",
    label: "Заказы",
    module: "orders",
    subItems: [
      { to: "/orders", label: "Все заказы" },
      { to: "/orders/offers", label: "ТКП" },
      { to: "/orders/contracts", label: "Договоры" },
    ],
  },
  {
    to: "/directory",
    label: "Справочники",
    module: "directory",
    subItems: [
      { to: "/directory/orgunits", label: "Организации" },
      { to: "/directory/contacts", label: "Контакты" },
      { to: "/directory/facilities", label: "Объекты" },
      { to: "/directory/countries", label: "Страны" },
      { to: "/directory/cities", label: "Города" },
      { to: "/directory/equipment", label: "Оборудование" },
      { to: "/directory/works", label: "Виды работ" },
      { to: "/directory/delivery-types", label: "Типы доставки" },
    ],
  },
  {
    to: "/devices",
    label: "Устройства",
    module: "devices",
    subItems: [
      { to: "/devices/rza", label: "Серии РЗА" },
      { to: "/devices/components", label: "Компоненты" },
      { to: "/devices/catalog", label: "Каталог продуктов" },
      { to: "/devices/product-types", label: "Типы продуктов" },
      { to: "/devices/voltage-classes", label: "Классы напряжения" },
    ],
  },
  {
    to: "/edo",
    label: "ЭДО",
    module: "edo",
    subItems: [
      { to: "/edo/inbox", label: "Входящие на согласование" },
      { to: "/edo/outbox", label: "Мои отправленные" },
      { to: "/edo/drafts", label: "Черновики" },
      { to: "/edo/archive", label: "Архив" },
      { to: "/edo/new", label: "Создать документ" },
      { to: "/edo/registry", label: "Реестр писем" },
      { to: "/edo/templates", label: "Шаблоны" },
      { to: "/edo/builder", label: "Конструктор" },
      { to: "/edo/parser", label: "Распознавание документов" },
      // Admin-only пункты — отфильтруются ниже по `group`.
      { to: "/edo/admin/types", label: "Админ: типы документов", group: "admin" },
      { to: "/edo/admin/org-heads", label: "Админ: шапки организаций", group: "admin" },
      { to: "/edo/admin/reports", label: "Админ: отчёты", group: "admin" },
    ],
  },
  {
    to: "/purchasing",
    label: "Закупки",
    module: "purchasing",
    subItems: [
      { to: "/purchasing/dashboard", label: "Панель" },
      { to: "/purchasing/orders", label: "Закупочные ордера" },
      { to: "/purchasing/requests", label: "Заявки" },
      { to: "/purchasing/stock", label: "Склад" },
      { to: "/purchasing/payments", label: "Оплаты" },
      { to: "/purchasing/suppliers", label: "Поставщики" },
      { to: "/purchasing/bom-cost", label: "Себестоимость" },
    ],
  },
  { to: "/accounting", label: "Бухгалтерия" },
  { to: "/profile", label: "Профиль" },
  { to: "/manager-dashboard", label: "Руководитель", requireAccess: "dashboard" },
]

/** Проверка одного group-выражения через состояние auth. */
function checkGroup(
  hasGroup: (g: string) => boolean,
  group: string | string[] | undefined,
): boolean {
  if (!group) return true
  const groups = Array.isArray(group) ? group : [group]
  return groups.some((g) => hasGroup(g))
}

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess)
  const hasGroup = useAuthStore((s) => s.hasGroup)
  const canAccessDashboard = useAuthStore((s) => s.canAccessDashboard)

  const visibleItems = navItems
    .filter(
      (item) =>
        (!item.module || hasModuleAccess(item.module)) &&
        checkGroup(hasGroup, item.group) &&
        (!item.requireAccess || (item.requireAccess === "dashboard" && canAccessDashboard())),
    )
    .map((item) =>
      item.subItems
        ? {
            ...item,
            subItems: item.subItems.filter(
              (sub) =>
                (!sub.module || hasModuleAccess(sub.module)) &&
                checkGroup(hasGroup, sub.group),
            ),
          }
        : item,
    )

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200",
        sidebarOpen ? "w-60" : "w-0 overflow-hidden",
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold">Bresler ERP</span>
      </div>
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {visibleItems.map((item) => (
          <SidebarNavItem key={item.to} item={item} />
        ))}
      </nav>
    </aside>
  )
}
