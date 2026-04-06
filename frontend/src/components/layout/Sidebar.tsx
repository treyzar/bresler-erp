import { useAuthStore } from "@/stores/useAuthStore"
import { useUIStore } from "@/stores/useUIStore"
import { cn } from "@/lib/utils"
import { type NavItem, SidebarNavItem } from "./SidebarNavItem"

type NavItemWithModule = NavItem & {
  module?: string
  requireAccess?: "dashboard"
  subItems?: (NavItem & { module?: string })[]
}

const navItems: NavItemWithModule[] = [
  { to: "/dashboard", label: "Главная" },
  { to: "/orders", label: "Заказы", module: "orders" },
  { to: "/directory/orgunits", label: "Организации", module: "directory" },
  { to: "/directory/contacts", label: "Контакты", module: "directory" },
  { to: "/directory/facilities", label: "Объекты", module: "directory" },
  { to: "/directory/countries", label: "Страны", module: "directory" },
  { to: "/directory/cities", label: "Города", module: "directory" },
  { to: "/directory/equipment", label: "Оборудование", module: "directory" },
  { to: "/directory/works", label: "Виды работ", module: "directory" },
  { to: "/directory/delivery-types", label: "Типы доставки", module: "directory" },
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
      { to: "/edo/registry", label: "Реестр писем" },
      { to: "/edo/templates", label: "Шаблоны" },
      { to: "/edo/builder", label: "Конструктор" },
      { to: "/edo/parser", label: "Парсер" },
    ],
  },
  { to: "/profile", label: "Профиль" },
  { to: "/manager-dashboard", label: "Руководитель", requireAccess: "dashboard" },
]

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess)
  const canAccessDashboard = useAuthStore((s) => s.canAccessDashboard)

  const visibleItems = navItems.filter(
    (item) =>
      (!item.module || hasModuleAccess(item.module)) &&
      (!item.requireAccess || (item.requireAccess === "dashboard" && canAccessDashboard())),
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
