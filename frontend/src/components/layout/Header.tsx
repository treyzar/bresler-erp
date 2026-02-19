import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/useAuthStore"
import { useUIStore } from "@/stores/useUIStore"

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

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <Button variant="ghost" size="sm" onClick={toggleSidebar}>
        Menu
      </Button>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? "Dark" : "Light"}
        </Button>
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
