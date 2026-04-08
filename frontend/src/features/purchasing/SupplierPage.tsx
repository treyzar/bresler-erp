import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Building2, Pencil, Save, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { purchasingApi } from "@/api/purchasingApi"
import type { SupplierConditionsType, PurchaseOrderListItem } from "@/api/types"
import { PURCHASE_ORDER_STATUSES } from "@/api/types"
import { useDebounce } from "@/hooks/useDebounce"

export function SupplierPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-conditions", page, debouncedSearch],
    queryFn: () => purchasingApi.supplierConditionsList({ page, search: debouncedSearch, page_size: 20 }),
  })

  const suppliers = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Building2 className="size-6" />
        <h1 className="text-2xl font-bold">Поставщики</h1>
        {data && <Badge variant="secondary">{data.count}</Badge>}
      </div>

      <Input
        placeholder="Поиск по названию поставщика..."
        value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-md"
      />

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Supplier list */}
          <Card className="lg:col-span-1">
            <CardContent className="p-0">
              {suppliers.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Нет поставщиков с сохранёнными условиями
                </p>
              ) : (
                <div className="divide-y">
                  {suppliers.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedId === s.id ? "bg-muted" : ""}`}
                      onClick={() => setSelectedId(s.id)}
                    >
                      <div className="font-medium text-sm">{s.supplier_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Number(s.discount_percent) > 0 ? `Скидка ${s.discount_percent}%` : "Без скидки"}
                        {s.payment_terms && ` · ${s.payment_terms.slice(0, 40)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier detail */}
          <div className="lg:col-span-2">
            {selectedId ? (
              <SupplierDetail conditionsId={selectedId} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Building2 className="size-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Выберите поставщика слева</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</Button>
          <span className="text-sm text-muted-foreground">Стр. {page} из {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Далее</Button>
        </div>
      )}
    </div>
  )
}

function SupplierDetail({ conditionsId }: { conditionsId: number }) {
  const qc = useQueryClient()
  const { data: conditions, isLoading } = useQuery({
    queryKey: ["supplier-conditions-detail", conditionsId],
    queryFn: () => purchasingApi.supplierConditionsDetail(conditionsId),
  })

  const { data: ordersData } = useQuery({
    queryKey: ["purchase-orders-by-supplier", conditions?.supplier],
    queryFn: () => purchasingApi.orderList({ supplier: conditions!.supplier, page_size: 50 }),
    enabled: !!conditions?.supplier,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SupplierConditionsType>) =>
      purchasingApi.supplierConditionsUpdate(conditionsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-conditions"] })
      qc.invalidateQueries({ queryKey: ["supplier-conditions-detail", conditionsId] })
      toast.success("Условия обновлены")
      setEditing(false)
    },
    onError: () => toast.error("Ошибка"),
  })

  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<Partial<SupplierConditionsType>>({})

  if (isLoading || !conditions) return <Skeleton className="h-64 w-full" />

  const orders = ordersData?.results ?? []

  const startEdit = () => {
    setEditValues({
      discount_percent: conditions.discount_percent,
      payment_terms: conditions.payment_terms,
      delivery_terms: conditions.delivery_terms,
      notes: conditions.notes,
    })
    setEditing(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{conditions.supplier_name}</CardTitle>
        {editing ? (
          <div className="flex gap-1">
            <Button size="sm" onClick={() => updateMutation.mutate(editValues)} disabled={updateMutation.isPending}>
              <Save className="size-3.5 mr-1" /> Сохранить
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="size-3.5 mr-1" /> Редактировать
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="conditions">
          <TabsList>
            <TabsTrigger value="conditions">Условия</TabsTrigger>
            <TabsTrigger value="history">История закупок ({orders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="conditions" className="mt-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Скидка (%)</label>
                {editing ? (
                  <Input
                    type="number" step="0.01" min={0} max={100}
                    value={editValues.discount_percent ?? ""}
                    onChange={(e) => setEditValues({ ...editValues, discount_percent: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium">{conditions.discount_percent}%</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Условия оплаты</label>
                {editing ? (
                  <Input
                    value={editValues.payment_terms ?? ""}
                    onChange={(e) => setEditValues({ ...editValues, payment_terms: e.target.value })}
                  />
                ) : (
                  <p className="text-sm">{conditions.payment_terms || "—"}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Условия доставки</label>
                {editing ? (
                  <Input
                    value={editValues.delivery_terms ?? ""}
                    onChange={(e) => setEditValues({ ...editValues, delivery_terms: e.target.value })}
                  />
                ) : (
                  <p className="text-sm">{conditions.delivery_terms || "—"}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Примечания</label>
              {editing ? (
                <Textarea
                  value={editValues.notes ?? ""}
                  onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                  rows={3}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{conditions.notes || "—"}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нет закупок у этого поставщика</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead className="w-24">Заказ</TableHead>
                    <TableHead className="w-28">Статус</TableHead>
                    <TableHead className="w-28">Дата</TableHead>
                    <TableHead className="w-32 text-right">Сумма</TableHead>
                    <TableHead>Закупщик</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm">{o.id}</TableCell>
                      <TableCell>{o.order_number ? `#${o.order_number}` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {PURCHASE_ORDER_STATUSES[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{o.order_date ? new Date(o.order_date).toLocaleDateString("ru") : "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(o.total_amount).toLocaleString("ru-RU")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.purchaser_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
