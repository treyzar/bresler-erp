import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart3, CreditCard, Package, TrendingUp, Truck, ArrowUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import apiClient from "@/api/client"

interface PriceComparison {
  name: string
  code: string
  purchase_avg: string
  purchase_min: string
  purchase_max: string
  kp_avg: string
  kp_min: string
  kp_max: string
  margin_percent: number | null
}

interface ForecastEntry {
  year: number
  count: number
  amount: string
  is_forecast: boolean
  label?: string
}

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
  price_comparison: PriceComparison[]
  by_month: { month: string; count: number; amount: string }[]
  forecast: ForecastEntry[]
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

  const { summary, top_suppliers, supplier_share, avg_prices, price_comparison, by_month, forecast } = data

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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="prices">Сравнение цен</TabsTrigger>
          <TabsTrigger value="forecast">Прогноз</TabsTrigger>
        </TabsList>

        {/* ── Overview tab ── */}
        <TabsContent value="overview" className="mt-4 space-y-6">
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

          {/* Monthly */}
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
        </TabsContent>

        {/* ── Price comparison tab ── */}
        <TabsContent value="prices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="size-4" />
                Закупочная цена vs Цена в КП
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {price_comparison.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Нет данных для сравнения. Нужны закупки и КП с одинаковыми продуктами.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Позиция</TableHead>
                      <TableHead className="w-28 text-right">Закупка (ср.)</TableHead>
                      <TableHead className="w-28 text-right">Закупка (мин-макс)</TableHead>
                      <TableHead className="w-28 text-right">КП (ср.)</TableHead>
                      <TableHead className="w-28 text-right">КП (мин-макс)</TableHead>
                      <TableHead className="w-24 text-right">Маржа</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {price_comparison.map((p) => (
                      <TableRow key={p.code || p.name}>
                        <TableCell className="text-sm">
                          {p.name}
                          {p.code && <span className="text-[10px] text-muted-foreground ml-1">({p.code})</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmtAmount(p.purchase_avg)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {fmtAmount(p.purchase_min)} — {fmtAmount(p.purchase_max)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmtAmount(p.kp_avg)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {fmtAmount(p.kp_min)} — {fmtAmount(p.kp_max)}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.margin_percent !== null ? (
                            <Badge variant={p.margin_percent >= 0 ? "default" : "destructive"}>
                              {p.margin_percent > 0 ? "+" : ""}{p.margin_percent}%
                            </Badge>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Forecast tab ── */}
        <TabsContent value="forecast" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Прогноз закупок по годам</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {forecast.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Нет данных. Прогноз будет доступен после загрузки исторических данных (минимум 2 года).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Год</TableHead>
                      <TableHead className="w-20 text-right">Заказов</TableHead>
                      <TableHead className="w-36 text-right">Сумма</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.map((f, i) => (
                      <TableRow key={`${f.year}-${f.is_forecast}`} className={f.is_forecast ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                        <TableCell className="font-medium">
                          {f.year}
                          {f.label && <span className="text-xs text-muted-foreground ml-1">({f.label})</span>}
                        </TableCell>
                        <TableCell className="text-right">{f.is_forecast ? "—" : f.count}</TableCell>
                        <TableCell className="text-right font-medium">{fmtAmount(f.amount)} руб.</TableCell>
                        <TableCell>
                          {f.is_forecast && <Badge variant="secondary" className="text-[10px]">прогноз</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <p className="p-3 text-[10px] text-muted-foreground border-t">
                Прогноз рассчитывается линейной экстраполяцией по данным предыдущих лет.
                Точность повышается с увеличением объёма исторических данных.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
