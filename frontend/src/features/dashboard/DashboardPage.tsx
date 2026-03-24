import { useNavigate } from "react-router"
import {
  ClipboardList,
  BookOpen,
  FileText,
  User,
  Plus,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/useAuthStore"

interface ModuleCard {
  title: string
  description: string
  icon: React.ReactNode
  path: string
  module: string | null
}

const modules: ModuleCard[] = [
  {
    title: "Управление заказами",
    description: "Создание, редактирование и отслеживание заказов",
    icon: <ClipboardList className="size-6" />,
    path: "/orders",
    module: "orders",
  },
  {
    title: "Справочники",
    description: "Организации, контакты, оборудование, виды работ",
    icon: <BookOpen className="size-6" />,
    path: "/directory",
    module: "directory",
  },
  {
    title: "Документооборот",
    description: "Электронный документооборот и реестр писем",
    icon: <FileText className="size-6" />,
    path: "/edo",
    module: "edo",
  },
  {
    title: "Мой профиль",
    description: "Настройки профиля и персональные данные",
    icon: <User className="size-6" />,
    path: "/profile",
    module: null,
  },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "Доброй ночи"
  if (hour < 12) return "Доброе утро"
  if (hour < 18) return "Добрый день"
  return "Добрый вечер"
}

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess)

  const displayName = user?.first_name || user?.username || "пользователь"
  const availableModules = modules.filter(
    (m) => m.module === null || hasModuleAccess(m.module)
  )

  return (
    <div className="p-6 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {displayName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Bresler ERP — система управления заказами и документооборотом
        </p>
      </div>

      {/* Module cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Модули системы</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableModules.map((mod) => (
            <Card
              key={mod.path}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
              onClick={() => navigate(mod.path)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {mod.icon}
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-base mb-1">{mod.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{mod.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Быстрые действия</h2>
        <div className="flex flex-wrap gap-3">
          {hasModuleAccess("orders") && (
            <Button variant="outline" onClick={() => navigate("/orders/new")}>
              <Plus className="size-4 mr-2" />
              Новый заказ
            </Button>
          )}
          {hasModuleAccess("edo") && (
            <Button variant="outline" onClick={() => navigate("/edo/registry")}>
              <FileText className="size-4 mr-2" />
              Реестр писем
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/profile")}>
            <User className="size-4 mr-2" />
            Мой профиль
          </Button>
        </div>
      </div>
    </div>
  )
}
