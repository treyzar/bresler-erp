import { NavLink } from "react-router"
import { useUIStore } from "@/stores/useUIStore"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/orders", label: "Заказы" },
  { to: "/directory/orgunits", label: "Организации" },
  { to: "/directory/contacts", label: "Контакты" },
  { to: "/directory/facilities", label: "Объекты" },
  { to: "/directory/countries", label: "Страны" },
  { to: "/directory/cities", label: "Города" },
  { to: "/directory/equipment", label: "Оборудование" },
  { to: "/directory/works", label: "Виды работ" },
  { to: "/directory/delivery-types", label: "Типы доставки" },
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
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/50",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
