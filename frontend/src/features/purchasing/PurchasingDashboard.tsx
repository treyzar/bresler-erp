import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart3, CreditCard, Package, TrendingUp, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import apiClient from "@/api/client"

interface DashboardData {
  summary: {
    total_orders: number
    total_amount: string
    delivered: number
    pending_payments: number
    pending_amount: string
  }
  top_suppliers: { name: string; total: string; orders_count: number }[]
  supplier_share: number | null
  avg_prices: { name: string; code: string; avg_price: string; total_qty: number; orders_count: number }[]
  by_month: { month: string; count: number; amount: string }[]
  years: number[]
}

export function PurchasingDashboard() {
  const [year, setYear] = useState<string>("all")

  const { data, isLoading } = useQuery({
    queryKey: ["purchasing-dashboard", year],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (year !== "all") params.year = year
      const { data } = await apiClient.get<DashboardData>("/purchasing/dashboard/", { params })
      return data
    },
  })

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>
  if (!data) return null

  const { summary, top_suppliers, supplier_share, avg_prices, by_month } = data

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="size-6" />
          <h1 className="text-2xl font-bold">Панель закупок</h1>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Все годы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все годы</SelectItem>
            {data.years.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={<Package className="size-4" />} label="Закупок" value={summary.total_orders} />
        <StatCard icon={<TrendingUp className="size-4" />} label="Общая сумма" value={fmtAmount(summary.total_amount)} />
        <StatCard icon={<Truck className="size-4" />} label="Доставлено" value={summary.delivered} />
        <StatCard icon={<CreditCard className="size-4" />} label="На согласовании" value={summary.pending_payments} sub={`${fmtAmount(summary.pending_amount)} руб.`} />
        <StatCard icon={<BarChart3 className="size-4" />} label="Доля топ поставщика" value={supplier_share !== null ? `${supplier_share}%` : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top suppliers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ поставщиков по сумме</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Поставщик</TableHead>
                  <TableHead className="w-20 text-right">Заказов</TableHead>
                  <TableHead className="w-32 text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top_suppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-sm">Нет данных</TableCell></TableRow>
                ) : top_suppliers.map((s, i) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-sm">
                      <Badge variant="outline" className="text-[10px] mr-2 w-5 justify-center">{i + 1}</Badge>
                      {s.name}
                    </TableCell>
                    <TableCell className="text-right">{s.orders_count}</TableCell>
                    <TableCell className="text-right font-medium">{fmtAmount(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Average prices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Закупочные цены (средние)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Позиция</TableHead>
                  <TableHead className="w-20 text-right">Кол-во</TableHead>
                  <TableHead className="w-28 text-right">Ср. цена</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avg_prices.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-sm">Нет данных</TableCell></TableRow>
                ) : avg_prices.map((p) => (
                  <TableRow key={p.code || p.name}>
                    <TableCell className="text-sm">
                      {p.name}
                      {p.code && <span className="text-[10px] text-muted-foreground ml-1">({p.code})</span>}
                    </TableCell>
                    <TableCell className="text-right">{p.total_qty}</TableCell>
                    <TableCell className="text-right font-medium">{fmtAmount(p.avg_price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Monthly chart (table fallback) */}
      {by_month.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Закупки по месяцам</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Месяц</TableHead>
                  <TableHead className="w-20 text-right">Заказов</TableHead>
                  <TableHead className="w-32 text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {by_month.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-right">{m.count}</TableCell>
                    <TableCell className="text-right">{fmtAmount(m.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function fmtAmount(val: string | number): string {
  return Number(val).toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className="rounded-lg p-2 bg-muted">{icon}</div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
