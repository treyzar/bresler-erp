import { useAuthStore } from "@/stores/useAuthStore"
import { useUIStore } from "@/stores/useUIStore"
import { cn } from "@/lib/utils"
import { type NavItem, SidebarNavItem } from "./SidebarNavItem"

/** Узел дерева меню с правами доступа (расширяет голый NavItem). */
type NavNode = NavItem & {
  module?: string
  /** Если задана, видно только пользователям этой группы (или одной из, если массив). */
  group?: string | string[]
  requireAccess?: "dashboard"
  subItems?: NavNode[]
}

const navItems: NavNode[] = [
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
      // Вложенный admin-блок: видно только группе `admin`. Сворачивается отдельно
      // от основного меню ЭДО, чтобы не мешал в обычной работе.
      {
        to: "/edo/admin",
        label: "Администрирование",
        group: "admin",
        subItems: [
          { to: "/edo/admin/types", label: "Типы документов" },
          { to: "/edo/admin/org-heads", label: "Шапки организаций" },
          { to: "/edo/admin/reports", label: "Отчёты" },
        ],
      },
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


function checkGroup(
  hasGroup: (g: string) => boolean,
  group: string | string[] | undefined,
): boolean {
  if (!group) return true
  const groups = Array.isArray(group) ? group : [group]
  return groups.some((g) => hasGroup(g))
}

/** Рекурсивно фильтрует дерево меню по правам доступа. Узел отфильтровывается,
 *  если не подходит сам или (после фильтрации) у него остался subItems-массив,
 *  но он стал пустым. Корневые узлы без subItems не зависят от детей. */
function filterTree(
  items: NavNode[],
  hasModuleAccess: (m: string) => boolean,
  hasGroup: (g: string) => boolean,
  canAccessDashboard: () => boolean,
): NavNode[] {
  const result: NavNode[] = []
  for (const item of items) {
    const moduleOk = !item.module || hasModuleAccess(item.module)
    const groupOk = checkGroup(hasGroup, item.group)
    const accessOk =
      !item.requireAccess ||
      (item.requireAccess === "dashboard" && canAccessDashboard())
    if (!moduleOk || !groupOk || !accessOk) continue

    if (item.subItems && item.subItems.length) {
      const filteredChildren = filterTree(
        item.subItems,
        hasModuleAccess,
        hasGroup,
        canAccessDashboard,
      )
      // Если у узла были дети, но все отфильтрованы — узел всё равно показываем,
      // если он сам — кликабельная страница. Если же узел чисто-контейнер
      // (исходно имел subItems, но все скрыты), скрываем целиком.
      if (filteredChildren.length === 0 && item.subItems.length > 0) {
        // Контейнер без детей — скрываем (например, «Администрирование»
        // у не-админа: subItems задумывались, но все три скрыты группой).
        continue
      }
      result.push({ ...item, subItems: filteredChildren })
    } else {
      result.push(item)
    }
  }
  return result
}

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess)
  const hasGroup = useAuthStore((s) => s.hasGroup)
  const canAccessDashboard = useAuthStore((s) => s.canAccessDashboard)

  const visibleItems = filterTree(navItems, hasModuleAccess, hasGroup, canAccessDashboard)

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
