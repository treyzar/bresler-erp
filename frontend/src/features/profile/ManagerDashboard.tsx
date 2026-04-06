import { useState } from "react"
import { Navigate, useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Users, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import apiClient from "@/api/client"
import type { ManagerStats } from "@/api/usersApi"
import { useAuthStore } from "@/stores/useAuthStore"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface TeamMember {
  id: number
  full_name: string
  department: string
  total: number
  current: number
  shipped: number
  total_amount: number
}

interface ManagerOrderItem {
  id: number
  order_number: number
  status: string
  status_display: string
  customer_name: string | null
  ship_date: string | null
  contract_amount: string | null
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  N: "outline", D: "secondary", P: "default", C: "secondary", S: "default", A: "outline",
}

interface TeamResponse {
  managers: TeamMember[]
  departments: string[]
  is_admin: boolean
  my_department: string
}

export function ManagerDashboard() {
  const navigate = useNavigate()
  const canAccessDashboard = useAuthStore((s) => s.canAccessDashboard)
  const [selectedManager, setSelectedManager] = useState<TeamMember | null>(null)
  const [deptFilter, setDeptFilter] = useState<string>("all")

  if (!canAccessDashboard()) {
    return <Navigate to="/profile" replace />
  }

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team-performance", deptFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (deptFilter !== "all") params.department = deptFilter
      const { data } = await apiClient.get<TeamResponse>("/users/team-performance/", { params })
      return data
    },
  })

  const team = teamData?.managers ?? []
  const departments = teamData?.departments ?? []
  const isAdmin = teamData?.is_admin ?? false

  const totalOrders = team.reduce((s, m) => s + m.total, 0)
  const totalShipped = team.reduce((s, m) => s + m.shipped, 0)
  const totalAmount = team.reduce((s, m) => s + m.total_amount, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="size-6" />
        <h1 className="text-2xl font-bold">Панель руководителя отдела</h1>
        {isAdmin && departments.length > 1 && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[220px] h-9 ml-4">
              <SelectValue placeholder="Все отделы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все отделы</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Сотрудников" value={team.length} />
        <SummaryCard label="Всего заказов" value={totalOrders} />
        <SummaryCard label="Реализовано" value={totalShipped} />
        <SummaryCard
          label="Общая сумма"
          value={totalAmount ? Number(totalAmount).toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }) : "—"}
        />
      </div>

      {/* Team table */}
      <Card>
        <CardHeader>
          <CardTitle>Сводная таблица по сотрудникам</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Отдел</TableHead>
                  <TableHead className="text-right">Всего</TableHead>
                  <TableHead className="text-right">В работе</TableHead>
                  <TableHead className="text-right">Реализовано</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.department || "—"}</TableCell>
                    <TableCell className="text-right">{m.total}</TableCell>
                    <TableCell className="text-right">{m.current}</TableCell>
                    <TableCell className="text-right">{m.shipped}</TableCell>
                    <TableCell className="text-right">
                      {m.total_amount
                        ? Number(m.total_amount).toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon" className="size-7"
                        onClick={() => setSelectedManager(m)}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manager detail dialog */}
      {selectedManager && (
        <ManagerDetailDialog
          manager={selectedManager}
          onClose={() => setSelectedManager(null)}
          onNavigate={(orderNumber) => navigate(`/orders/${orderNumber}`)}
        />
      )}
    </div>
  )
}

// ── Manager detail dialog ───────────────────────────────────────

function ManagerDetailDialog({ manager, onClose, onNavigate }: {
  manager: TeamMember
  onClose: () => void
  onNavigate: (orderNumber: number) => void
}) {
  const { data: stats } = useQuery({
    queryKey: ["user-stats", manager.id],
    queryFn: async () => {
      const { data } = await apiClient.get<ManagerStats & { user: { id: number; full_name: string } }>(
        `/users/${manager.id}/stats/`,
      )
      return data
    },
  })

  const [ordersGroup, setOrdersGroup] = useState("current")
  const [ordersPage, setOrdersPage] = useState(1)

  const { data: ordersData } = useQuery({
    queryKey: ["user-orders", manager.id, ordersGroup, ordersPage],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${manager.id}/orders/`, {
        params: { group: ordersGroup, page: ordersPage, page_size: 20 },
      })
      return data as {
        orders: ManagerOrderItem[]
        count: number
        page: number
        page_size: number
      }
    },
  })

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{manager.full_name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            <TabsTrigger value="stats">Статистика</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              {([["current", "Текущие"], ["shipped", "Реализованные"], ["all", "Все"]] as const).map(([key, label]) => (
                <Button
                  key={key}
                  variant={ordersGroup === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setOrdersGroup(key); setOrdersPage(1) }}
                >
                  {label}
                </Button>
              ))}
            </div>

            {!ordersData?.orders.length ? (
              <p className="text-sm text-muted-foreground py-4">Нет заказов</p>
            ) : (
              <>
                <div className="divide-y">
                  {ordersData.orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => onNavigate(o.order_number)}
                      className="flex items-center justify-between py-2.5 w-full text-left hover:bg-muted/50 px-2 -mx-2 rounded text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold">#{o.order_number}</span>
                        {o.customer_name && <span className="text-muted-foreground">{o.customer_name}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {o.contract_amount && (
                          <span className="text-xs font-medium">
                            {Number(o.contract_amount).toLocaleString("ru-RU")} руб.
                          </span>
                        )}
                        {o.ship_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(o.ship_date).toLocaleDateString("ru")}
                          </span>
                        )}
                        <Badge variant={statusVariant[o.status] ?? "outline"} className="text-[10px]">
                          {o.status_display}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
                {ordersData.count > ordersData.page_size && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">{ordersData.count} заказов</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setOrdersPage(ordersPage - 1)} disabled={ordersPage <= 1}>Назад</Button>
                      <Button variant="outline" size="sm" onClick={() => setOrdersPage(ordersPage + 1)} disabled={ordersData.orders.length < ordersData.page_size}>Вперёд</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            {stats ? (
              <ManagerStatsView stats={stats} />
            ) : (
              <Skeleton className="h-60 w-full" />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ── Stats view (reusing the same layout as MyStatsTab) ──────────

function ManagerStatsView({ stats }: { stats: ManagerStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Всего заказов" value={stats.total_orders} />
        <MiniStat label="Реализовано" value={stats.shipped} />
        <MiniStat label="Конверсия КП" value={`${stats.conversion}%`} />
        <MiniStat label="Доля" value={`${stats.my_share}%`} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Топ заказчиков</h4>
          {stats.top_customers.map((c) => (
            <div key={c.name} className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{c.name}</span>
              <span className="font-medium">{c.count}</span>
            </div>
          ))}
          {stats.top_customers.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Топ оборудования</h4>
          {stats.top_equipment.map((e) => (
            <div key={e.name} className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{e.name}</span>
              <span className="font-medium">{e.count}</span>
            </div>
          ))}
          {stats.top_equipment.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
