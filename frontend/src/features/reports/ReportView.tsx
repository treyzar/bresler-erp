import { useState, useMemo } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/api/client"
import { useDebounce } from "@/hooks/useDebounce"
import type { PaginatedResponse } from "@/api/types"

interface ReportResponse {
  meta: { title: string; filters: any[]; columns: any[]; chart: any }
  data: Record<string, any>[]
  count: number
  page: number
  page_size: number
  total_pages: number
}

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

// ── Combobox filter for directory lookups ────────────────────────

function DirectoryCombobox({
  endpoint, value, onChange, placeholder,
}: {
  endpoint: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const { data: options = [] } = useQuery({
    queryKey: ["directory-options", endpoint, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string> = { page_size: "30" }
      if (debouncedSearch) params.search = debouncedSearch
      const { data } = await apiClient.get<PaginatedResponse<{ id: number; name: string }>>(endpoint, { params })
      return data.results
    },
  })

  return (
    <div className="relative w-[220px]">
      <Input
        value={value || search}
        onChange={(e) => {
          setSearch(e.target.value)
          // Clear selection when typing
          if (value) onChange("")
        }}
        placeholder={placeholder}
        className="h-9"
      />
      {search && !value && options.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-[200px] overflow-auto">
          {options.map((o) => (
            <div
              key={o.id}
              className="px-3 py-1.5 text-sm cursor-pointer hover:bg-muted"
              onClick={() => {
                onChange(o.name)
                setSearch("")
              }}
            >
              {o.name}
            </div>
          ))}
        </div>
      )}
      {value && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          onClick={() => { onChange(""); setSearch("") }}
        >
          &times;
        </button>
      )}
    </div>
  )
}

// ── Filter type → directory endpoint mapping ────────────────────

const DIRECTORY_FILTERS: Record<string, { endpoint: string; placeholder: string }> = {
  customer: { endpoint: "/directory/orgunits/", placeholder: "Выберите заказчика..." },
  equipment: { endpoint: "/directory/equipment/", placeholder: "Выберите оборудование..." },
}

// ── Main component ──────────────────────────────────────────────

export function ReportView({ reportName, onBack }: ReportViewProps) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const debouncedFilters = useDebounce(filters, 500)

  // Load meta once (no filters dependency)
  const { data: metaResult } = useQuery({
    queryKey: ["reports", "meta", reportName],
    queryFn: async () => {
      const { data } = await apiClient.get(`/reports/${reportName}/`, {
        params: { page: 1, page_size: pageSize },
      })
      return data as ReportResponse
    },
  })

  const meta = metaResult?.meta

  // Load data with debounced filters + pagination
  const { data: result, isLoading: dataLoading } = useQuery({
    queryKey: ["reports", "data", reportName, debouncedFilters, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        page_size: String(pageSize),
      }
      for (const [k, v] of Object.entries(debouncedFilters)) {
        if (v) params[k] = v
      }
      const { data } = await apiClient.get(`/reports/${reportName}/`, { params })
      return data as ReportResponse
    },
    placeholderData: (prev) => prev,
  })

  const rows = result?.data ?? []
  const totalCount = result?.count ?? 0
  const totalPages = result?.total_pages ?? 1
  const chart = meta?.chart

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  const handleExcelDownload = async () => {
    const params: Record<string, string> = { export: "xlsx" }
    for (const [k, v] of Object.entries(debouncedFilters)) {
      if (v) params[k] = v
    }
    const { data, headers } = await apiClient.get(
      `/reports/${reportName}/`,
      { params, responseType: "blob" },
    )
    const filename = headers["content-disposition"]?.match(/filename="?(.+?)"?$/)?.[1] ?? `${reportName}.xlsx`
    const url = URL.createObjectURL(data)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header — always stable, uses meta */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1" />
          Назад
        </Button>
        <h1 className="text-2xl font-bold">{meta?.title || reportName}</h1>
        <Badge variant="outline">{totalCount.toLocaleString("ru-RU")} записей</Badge>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExcelDownload}
            disabled={rows.length === 0}
          >
            <Download className="size-3.5 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Filters — always visible once meta loaded */}
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
                  ) : DIRECTORY_FILTERS[f.name] ? (
                    <DirectoryCombobox
                      endpoint={DIRECTORY_FILTERS[f.name].endpoint}
                      value={filters[f.name] || ""}
                      onChange={(v) => handleFilterChange(f.name, v)}
                      placeholder={DIRECTORY_FILTERS[f.name].placeholder}
                    />
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
                    {rows.map((_: any, i: number) => (
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
          {dataLoading && rows.length === 0 ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
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
                  {rows.map((row: any, i: number) => (
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
                          ) : col.type === "date" ? (
                            row[col.name] ? new Date(row[col.name]).toLocaleDateString("ru") : "—"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Стр. {page} из {totalPages} ({totalCount.toLocaleString("ru-RU")} записей)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              &laquo;
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              &lsaquo; Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              Вперёд &rsaquo;
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              &raquo;
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
