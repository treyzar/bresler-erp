import { useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Plus,
  FileText,
  BarChart3,
  Upload,
} from "lucide-react"
import {
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useAuthStore } from "@/stores/useAuthStore"
import apiClient from "@/api/client"

const STATUS_COLORS: Record<string, string> = {
  N: "oklch(0.646 0.222 41.116)",
  D: "oklch(0.6 0.118 184.704)",
  P: "oklch(0.398 0.07 227.392)",
  C: "oklch(0.828 0.189 84.429)",
  S: "oklch(0.769 0.188 70.08)",
  A: "oklch(0.556 0.016 286)",
}

const pieChartConfig: ChartConfig = {
  N: { label: "Новый", color: STATUS_COLORS.N },
  D: { label: "Договор", color: STATUS_COLORS.D },
  P: { label: "Производство", color: STATUS_COLORS.P },
  C: { label: "Собран", color: STATUS_COLORS.C },
  S: { label: "Отгружен", color: STATUS_COLORS.S },
  A: { label: "Архив", color: STATUS_COLORS.A },
}

const lineChartConfig: ChartConfig = {
  count: { label: "Создано заказов", color: "oklch(0.646 0.222 41.116)" },
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "Доброй ночи"
  if (hour < 12) return "Доброе утро"
  if (hour < 18) return "Добрый день"
  return "Добрый вечер"
}

interface DashboardData {
  total_orders: number
  in_progress: number
  overdue: number
  total_contract_amount: number
  orders_by_status: { status: string; label: string; count: number }[]
  orders_timeline: { month: string; count: number }[]
  my_orders: {
    order_number: number
    status: string
    status_label: string
    customer: string
    ship_date: string | null
  }[]
}

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess)

  const { data } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get("/dashboard/")
      return data
    },
    refetchInterval: 300_000, // 5 min
  })

  const displayName = user?.first_name || user?.username || "пользователь"

  return (
    <div className="p-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {displayName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Bresler ERP — система управления заказами и документооборотом
        </p>
      </div>

      {/* Number cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberCard
            icon={<ClipboardList className="size-5" />}
            label="Всего заказов"
            value={data.total_orders}
          />
          <NumberCard
            icon={<TrendingUp className="size-5" />}
            label="В работе"
            value={data.in_progress}
            color="text-blue-600"
          />
          <NumberCard
            icon={<AlertTriangle className="size-5" />}
            label="Просрочено"
            value={data.overdue}
            color={data.overdue > 0 ? "text-red-600" : "text-green-600"}
          />
          <NumberCard
            icon={<CreditCard className="size-5" />}
            label="Сумма контрактов"
            value={data.total_contract_amount.toLocaleString("ru-RU", {
              style: "currency", currency: "RUB", maximumFractionDigits: 0,
            })}
          />
        </div>
      )}

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie chart — orders by status */}
          {data.orders_by_status.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Заказы по статусам</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={pieChartConfig} className="h-72 w-full">
                  <PieChart>
                    <Pie
                      data={data.orders_by_status}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {data.orders_by_status.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] || STATUS_COLORS.N}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="label" />}
                    />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value: string, entry: { payload?: Record<string, unknown> }) => {
                        const count = entry?.payload?.count ?? entry?.payload?.value ?? ""
                        return (
                          <span className="text-xs text-muted-foreground">
                            {value} ({count})
                          </span>
                        )
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Line chart — orders timeline */}
          {data.orders_timeline.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Динамика заказов (12 мес.)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={lineChartConfig} className="h-64 w-full">
                  <LineChart data={data.orders_timeline}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* My orders + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My orders */}
        {data && data.my_orders.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Мои заказы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {data.my_orders.map((order) => (
                  <div
                    key={order.order_number}
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                    onClick={() => navigate(`/orders/${order.order_number}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">#{order.order_number}</span>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {order.customer}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.ship_date && (
                        <span className="text-xs text-muted-foreground">{order.ship_date}</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {order.status_label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hasModuleAccess("orders") && (
                <Button variant="outline" size="sm" onClick={() => navigate("/orders/new")}>
                  <Plus className="size-4 mr-1" />
                  Новый заказ
                </Button>
              )}
              {hasModuleAccess("orders") && (
                <Button variant="outline" size="sm" onClick={() => navigate("/orders")}>
                  <ClipboardList className="size-4 mr-1" />
                  Все заказы
                </Button>
              )}
              {hasModuleAccess("edo") && (
                <Button variant="outline" size="sm" onClick={() => navigate("/edo/registry")}>
                  <FileText className="size-4 mr-1" />
                  Реестр писем
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
                <BarChart3 className="size-4 mr-1" />
                Отчёты
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/import")}>
                <Upload className="size-4 mr-1" />
                Импорт
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function NumberCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
