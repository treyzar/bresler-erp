import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Download } from "lucide-react"
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import apiClient from "@/api/client"

const CHART_COLORS = [
  "oklch(0.646 0.222 41.116)",
  "oklch(0.6 0.118 184.704)",
  "oklch(0.398 0.07 227.392)",
  "oklch(0.828 0.189 84.429)",
  "oklch(0.769 0.188 70.08)",
]

interface ReportViewProps {
  reportName: string
  onBack: () => void
}

export function ReportView({ reportName, onBack }: ReportViewProps) {
  const [filters, setFilters] = useState<Record<string, string>>({})

  const { data: result, isLoading } = useQuery({
    queryKey: ["reports", "detail", reportName, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) {
        if (v) params.set(k, v)
      }
      const { data } = await apiClient.get(`/reports/${reportName}/?${params}`)
      return data as {
        meta: { title: string; filters: any[]; columns: any[]; chart: any }
        data: Record<string, any>[]
        count: number
      }
    },
  })

  const meta = result?.meta
  const rows = result?.data ?? []
  const chart = meta?.chart

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1" />
          Назад
        </Button>
        <h1 className="text-2xl font-bold">{meta?.title || reportName}</h1>
        <Badge variant="outline">{result?.count ?? 0} записей</Badge>
      </div>

      {/* Filters */}
      {meta?.filters && meta.filters.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-end gap-4">
              {meta.filters.map((f: any) => (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">{f.label}</label>
                  {f.type === "select" && f.choices ? (
                    <Select
                      value={filters[f.name] || ""}
                      onValueChange={(val) => handleFilterChange(f.name, val === "__all__" ? "" : val)}
                    >
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Все" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Все</SelectItem>
                        {f.choices.map(([value, label]: [string, string]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type === "date" ? "date" : "text"}
                      value={filters[f.name] || ""}
                      onChange={(e) => handleFilterChange(f.name, e.target.value)}
                      className="w-[180px] h-9"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chart && rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{chart.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ [chart.value_field]: { label: chart.title, color: CHART_COLORS[0] } } satisfies ChartConfig}
              className="h-72 w-full"
            >
              {chart.chart_type === "pie" ? (
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey={chart.value_field}
                    nameKey={chart.label_field}
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {rows.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey={chart.label_field} />} />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string, entry: any) => {
                      const count = entry?.payload?.[chart.value_field] ?? entry?.payload?.value ?? ""
                      return (
                        <span className="text-xs text-muted-foreground">
                          {value} ({count})
                        </span>
                      )
                    }}
                  />
                </PieChart>
              ) : chart.chart_type === "line" ? (
                <LineChart data={rows}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey={chart.label_field} tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey={chart.value_field}
                    stroke={`var(--color-${chart.value_field})`}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={rows} margin={{ bottom: rows.length > 5 ? 60 : 20 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey={chart.label_field}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={rows.length > 5 ? -35 : 0}
                    textAnchor={rows.length > 5 ? "end" : "middle"}
                    height={rows.length > 5 ? 80 : 30}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey={chart.value_field}
                    fill={`var(--color-${chart.value_field})`}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Нет данных</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {meta?.columns.map((col: any) => (
                      <TableHead key={col.name}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      {meta?.columns.map((col: any) => (
                        <TableCell key={col.name}>
                          {col.type === "badge" ? (
                            <Badge variant="outline">{row[col.name]}</Badge>
                          ) : col.type === "currency" ? (
                            row[col.name]
                              ? Number(row[col.name]).toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })
                              : "—"
                          ) : col.type === "number" ? (
                            Number(row[col.name]).toLocaleString("ru-RU")
                          ) : (
                            row[col.name] ?? "—"
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
