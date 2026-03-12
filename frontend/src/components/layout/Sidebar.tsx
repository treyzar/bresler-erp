import { useUIStore } from "@/stores/useUIStore"
import { cn } from "@/lib/utils"
import { type NavItem, SidebarNavItem } from "./SidebarNavItem"

const navItems: NavItem[] = [
  { to: "/orders", label: "Заказы" },
  { to: "/directory/orgunits", label: "Организации" },
  { to: "/directory/contacts", label: "Контакты" },
  { to: "/directory/facilities", label: "Объекты" },
  { to: "/directory/countries", label: "Страны" },
  { to: "/directory/cities", label: "Города" },
  { to: "/directory/equipment", label: "Оборудование" },
  { to: "/directory/works", label: "Виды работ" },
  { to: "/directory/delivery-types", label: "Типы доставки" },
  {
    to: "/edo",
    label: "ЭДО",
    subItems: [
      { to: "/edo/builder", label: "Конструктор" },
      { to: "/edo/parser", label: "Парсер" },
    ]
  },
  { to: "/profile", label: "Профиль" },
]

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

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
        {navItems.map((item) => (
          <SidebarNavItem key={item.to} item={item} />
        ))}
      </nav>
    </aside>
  )
}
