import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Calculator, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import apiClient from "@/api/client"
import type { PaginatedResponse, Product } from "@/api/types"
import { useDebounce } from "@/hooks/useDebounce"

interface BOMLine {
  component_id: number
  component_name: string
  component_code: string
  role: string
  quantity: number
  base_price: string
  latest_purchase_price: string | null
  avg_purchase_price: string | null
  unit_cost: string
  line_cost: string
}

interface BOMCostData {
  product: { id: number; name: string; code: string }
  bom_lines: BOMLine[]
  total_cost: string
  base_price: string
  margin_percent: number | null
}

const ROLE_LABELS: Record<string, string> = {
  RZA_TERMINAL: "МП терминал РЗА",
  ACCESSORY: "Аксессуар",
  WIRING: "Проводка",
  MISC: "Прочее",
}

export function BOMCostPage() {
  const [search, setSearch] = useState("")
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data: products = [], isLoading: searchLoading } = useQuery({
    queryKey: ["products-bom-search", debouncedSearch],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>(
        "/devices/products/", { params: { search: debouncedSearch, page_size: 30 } },
      )
      return data.results
    },
    enabled: debouncedSearch.length >= 2,
  })

  const { data: bomData, isLoading: bomLoading } = useQuery({
    queryKey: ["bom-cost", selectedProductId],
    queryFn: async () => {
      const { data } = await apiClient.get<BOMCostData>(`/purchasing/bom-cost/${selectedProductId}/`)
      return data
    },
    enabled: !!selectedProductId,
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Calculator className="size-6" />
        <h1 className="text-2xl font-bold">Себестоимость по BOM</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product search */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Выберите продукт</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или коду..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[500px] overflow-auto space-y-1">
              {searchLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : search.length < 2 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Введите мин. 2 символа</p>
              ) : products.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Не найдено</p>
              ) : products.map((p) => (
                <div
                  key={p.id}
                  className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                    selectedProductId === p.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                  }`}
                  onClick={() => setSelectedProductId(p.id)}
                >
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.internal_code}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* BOM cost result */}
        <div className="lg:col-span-2">
          {!selectedProductId ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Calculator className="size-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Выберите продукт для расчёта себестоимости</p>
                <p className="text-xs mt-1">Себестоимость рассчитывается на основе BOM и актуальных закупочных цен</p>
              </CardContent>
            </Card>
          ) : bomLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : bomData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{bomData.product.name}</span>
                  <Badge variant="outline" className="font-mono">{bomData.product.code}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="border rounded-lg p-3">
                    <p className="text-lg font-bold">{fmtPrice(bomData.total_cost)}</p>
                    <p className="text-xs text-muted-foreground">Себестоимость (BOM)</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-lg font-bold">{fmtPrice(bomData.base_price)}</p>
                    <p className="text-xs text-muted-foreground">Базовая цена</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className={`text-lg font-bold ${
                      bomData.margin_percent !== null && bomData.margin_percent < 0 ? "text-destructive" : "text-green-600"
                    }`}>
                      {bomData.margin_percent !== null ? `${bomData.margin_percent > 0 ? "+" : ""}${bomData.margin_percent}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Маржа</p>
                  </div>
                </div>

                <Separator />

                {/* BOM lines */}
                {bomData.bom_lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    У этого продукта нет BOM (спецификации состава).
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Компонент</TableHead>
                        <TableHead className="w-24">Роль</TableHead>
                        <TableHead className="w-16 text-right">Кол-во</TableHead>
                        <TableHead className="w-28 text-right">Базовая</TableHead>
                        <TableHead className="w-28 text-right">Закупка (посл.)</TableHead>
                        <TableHead className="w-28 text-right">Закупка (ср.)</TableHead>
                        <TableHead className="w-28 text-right">Итого</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomData.bom_lines.map((l) => (
                        <TableRow key={`${l.component_id}-${l.role}`}>
                          <TableCell className="text-sm">
                            {l.component_name}
                            <span className="text-[10px] text-muted-foreground ml-1">({l.component_code})</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {ROLE_LABELS[l.role] ?? l.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{l.quantity}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{fmtPrice(l.base_price)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {l.latest_purchase_price ? (
                              <span className="font-medium">{fmtPrice(l.latest_purchase_price)}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {l.avg_purchase_price ? fmtPrice(l.avg_purchase_price) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">{fmtPrice(l.line_cost)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold border-t-2">
                        <TableCell colSpan={6} className="text-right">Итого себестоимость:</TableCell>
                        <TableCell className="text-right">{fmtPrice(bomData.total_cost)} руб.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function fmtPrice(val: string | number): string {
  return Number(val).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
