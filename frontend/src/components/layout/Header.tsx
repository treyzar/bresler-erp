import { useNavigate } from "react-router"
import { Sun, Moon, Palette, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/useAuthStore"
import { useUIStore, type Theme } from "@/stores/useUIStore"
import { NotificationBell } from "./NotificationBell"

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "orange-light", label: "Orange", icon: Palette },
  { value: "orange-dark", label: "Orange Dark", icon: Palette },
]

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const { theme, setTheme } = useUIStore()

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const currentOption = themeOptions.find((o) => o.value === theme) ?? themeOptions[0]
  const CurrentIcon = currentOption.icon

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <Button variant="ghost" size="sm" onClick={toggleSidebar}>
        Menu
      </Button>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <CurrentIcon className="size-4" />
              {currentOption.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {themeOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className="gap-2"
                >
                  <Icon
                    className={
                      opt.value.startsWith("orange")
                        ? "size-4 text-orange-500"
                        : "size-4"
                    }
                  />
                  {opt.label}
                  {theme === opt.value && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        {user && (
          <span className="text-sm text-muted-foreground">
            {user.full_name || user.username}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Выход
        </Button>
      </div>
    </header>
  )
}
