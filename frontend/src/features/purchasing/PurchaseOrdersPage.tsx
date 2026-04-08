import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ShoppingCart, Plus, Eye, Trash2, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { OrgUnitCombobox } from "@/components/shared/OrgUnitCombobox"
import { purchasingApi } from "@/api/purchasingApi"
import type { PurchaseOrderListItem, PurchaseOrderDetail, PurchasePaymentType } from "@/api/types"
import { PURCHASE_ORDER_STATUSES, PAYMENT_STATUSES } from "@/api/types"
import { useDebounce } from "@/hooks/useDebounce"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  ordered: "secondary",
  partial: "default",
  delivered: "default",
  cancelled: "destructive",
}

export function PurchaseOrdersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderListItem | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const params: Record<string, unknown> = { page, search: debouncedSearch, page_size: 20 }
  if (statusFilter !== "all") params.status = statusFilter

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: () => purchasingApi.orderList(params),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchasingApi.orderDelete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); toast.success("Удалено") },
  })

  const orders = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="size-6" />
          <h1 className="text-2xl font-bold">Закупки</h1>
          {data && <Badge variant="secondary">{data.count}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => purchasingApi.orderExport(params)}>
            <Download className="size-3.5 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5 mr-1" /> Новая закупка
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Поиск по поставщику, заказу..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Все статусы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(PURCHASE_ORDER_STATUSES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-96 w-full" /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead className="w-24">Заказ</TableHead>
                  <TableHead className="w-28">Статус</TableHead>
                  <TableHead className="w-28">Дата</TableHead>
                  <TableHead className="w-32 text-right">Сумма</TableHead>
                  <TableHead className="w-36">Закупщик</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Нет закупок</TableCell></TableRow>
                ) : orders.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setDetailId(o.id)}>
                    <TableCell className="font-mono text-sm">{o.id}</TableCell>
                    <TableCell className="font-medium">{o.supplier_name}</TableCell>
                    <TableCell>{o.order_number ? `#${o.order_number}` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[o.status] ?? "outline"}>
                        {PURCHASE_ORDER_STATUSES[o.status] ?? o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{o.order_date ? new Date(o.order_date).toLocaleDateString("ru") : "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(o.total_amount).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.purchaser_name}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => setDetailId(o.id)}>
                          <Eye className="size-3.5" />
                        </Button>
                        {o.status === "draft" && (
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setDeleteTarget(o)}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</Button>
          <span className="text-sm text-muted-foreground">Стр. {page} из {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Далее</Button>
        </div>
      )}

      {detailId && <PurchaseOrderDetailDialog id={detailId} onClose={() => setDetailId(null)} />}

      {createOpen && <CreatePurchaseOrderDialog open={createOpen} onClose={() => setCreateOpen(false)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Удалить закупку?"
        description={`Закупка у ${deleteTarget?.supplier_name} будет удалена.`}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }) }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ── Detail dialog ──────────────────────────────────────────────

function PurchaseOrderDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: order, isLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => purchasingApi.orderDetail(id),
  })

  const { data: payments = { results: [] } } = useQuery({
    queryKey: ["purchase-payments", id],
    queryFn: () => purchasingApi.paymentList({ purchase_order: id }),
  })

  const approveMutation = useMutation({
    mutationFn: (paymentId: number) => purchasingApi.paymentApprove(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-payments", id] })
      toast.success("Оплата согласована")
    },
  })

  if (isLoading || !order) return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent aria-describedby={undefined}><Skeleton className="h-48 w-full" /></DialogContent>
    </Dialog>
  )

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Закупка #{order.id} — {order.supplier_name}
            <Badge variant={statusVariant[order.status] ?? "outline"}>
              {PURCHASE_ORDER_STATUSES[order.status] ?? order.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-muted-foreground">Заказ:</span> {order.order_number ? `#${order.order_number}` : "—"}</div>
          <div><span className="text-muted-foreground">Дата:</span> {order.order_date ? new Date(order.order_date).toLocaleDateString("ru") : "—"}</div>
          <div><span className="text-muted-foreground">Ожид.:</span> {order.expected_date ? new Date(order.expected_date).toLocaleDateString("ru") : "—"}</div>
          <div><span className="text-muted-foreground">Закупщик:</span> {order.purchaser_name}</div>
        </div>

        <Tabs defaultValue="lines">
          <TabsList>
            <TabsTrigger value="lines">Позиции ({order.lines.length})</TabsTrigger>
            <TabsTrigger value="payments">Оплаты ({payments.results?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="files">Файлы ({order.files.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="lines" className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Наименование</TableHead>
                  <TableHead className="w-20 text-right">Кол-во</TableHead>
                  <TableHead className="w-28 text-right">Цена</TableHead>
                  <TableHead className="w-28 text-right">Итого</TableHead>
                  <TableHead className="w-20 text-right">Поставлено</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((l, i) => (
                  <TableRow key={l.id ?? i}>
                    <TableCell>{l.name}</TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell className="text-right">{Number(l.unit_price).toLocaleString("ru-RU")}</TableCell>
                    <TableCell className="text-right font-medium">{Number(l.total_price).toLocaleString("ru-RU")}</TableCell>
                    <TableCell className="text-right">{l.delivered_quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-2" />
            <div className="text-right font-semibold">
              Итого: {Number(order.total_amount).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-3 space-y-2">
            {(payments.results ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нет оплат</p>
            ) : (payments.results ?? []).map((p: PurchasePaymentType) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{Number(p.amount).toLocaleString("ru-RU")} руб.</div>
                  <div className="text-xs text-muted-foreground">
                    {p.invoice_number && `Счёт ${p.invoice_number} · `}
                    {p.due_date && `Срок: ${new Date(p.due_date).toLocaleDateString("ru")}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{PAYMENT_STATUSES[p.status] ?? p.status}</Badge>
                  {p.status === "pending_approval" && (
                    <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(p.id)}>
                      Согласовать
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="files" className="mt-3 space-y-2">
            {order.files.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нет файлов</p>
            ) : order.files.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <a href={f.file} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {f.original_name}
                </a>
                <span className="text-muted-foreground text-xs">{(f.file_size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {order.note && (
          <div className="text-sm border-t pt-2">
            <span className="text-muted-foreground">Примечание:</span> {order.note}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Create dialog ──────────────────────────────────────────────

function CreatePurchaseOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [note, setNote] = useState("")

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => purchasingApi.orderCreate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success("Закупка создана")
      onClose()
    },
    onError: () => toast.error("Ошибка создания"),
  })

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Новая закупка</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Поставщик *</label>
            <OrgUnitCombobox
              value={supplierId}
              onChange={setSupplierId}
              businessRole="supplier"
              placeholder="Выберите поставщика..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Примечание</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Примечание" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
            <Button
              disabled={!supplierId || createMutation.isPending}
              onClick={() => createMutation.mutate({ supplier: supplierId, note })}
            >
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
