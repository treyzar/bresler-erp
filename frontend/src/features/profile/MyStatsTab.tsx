import { useQuery } from "@tanstack/react-query"
import { BarChart3, TrendingUp, Users, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { usersApi } from "@/api/usersApi"

export function MyStatsTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["users", "me", "stats"],
    queryFn: () => usersApi.myStats(),
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Всего заказов" value={stats.total_orders} icon={<Package className="size-4" />} />
        <StatCard label="Реализовано" value={stats.shipped} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Конверсия КП" value={`${stats.conversion}%`} icon={<BarChart3 className="size-4" />} sub={`${stats.accepted_kp} из ${stats.total_kp} КП`} />
        <StatCard label="Моя доля" value={`${stats.my_share}%`} icon={<Users className="size-4" />} sub="от всех реализованных" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ-5 заказчиков</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {stats.top_customers.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] w-5 justify-center">{i + 1}</Badge>
                      {c.name}
                    </span>
                    <span className="font-medium">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top equipment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ-5 оборудования</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_equipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {stats.top_equipment.map((e, i) => (
                  <div key={e.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] w-5 justify-center">{i + 1}</Badge>
                      {e.name}
                    </span>
                    <span className="font-medium">{e.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By year */}
      {stats.by_year.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Реализация по годам</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Год</TableHead>
                  <TableHead className="text-right">Заказов</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.by_year.map((y) => (
                  <TableRow key={y.year}>
                    <TableCell className="font-medium">{y.year ?? "—"}</TableCell>
                    <TableCell className="text-right">{y.count}</TableCell>
                    <TableCell className="text-right">
                      {y.amount ? Number(y.amount).toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }) : "—"}
                    </TableCell>
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

function StatCard({ label, value, icon, sub }: {
  label: string; value: number | string; icon: React.ReactNode; sub?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className="rounded-lg p-2 bg-muted">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
