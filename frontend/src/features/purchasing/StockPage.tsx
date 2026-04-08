import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Package, ArrowDownToLine, Eye } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { purchasingApi } from "@/api/purchasingApi"
import type { StockItemType, StockMovementType } from "@/api/types"
import { STOCK_MOVEMENT_TYPES } from "@/api/types"
import { useDebounce } from "@/hooks/useDebounce"

export function StockPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [detailItem, setDetailItem] = useState<StockItemType | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ["stock", page, debouncedSearch],
    queryFn: () => purchasingApi.stockList({ page, search: debouncedSearch, page_size: 50 }),
  })

  const items = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / 50) : 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="size-6" />
          <h1 className="text-2xl font-bold">Склад</h1>
          {data && <Badge variant="secondary">{data.count} позиций</Badge>}
        </div>
      </div>

      <Input
        placeholder="Поиск по наименованию или артикулу..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-md"
      />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Наименование</TableHead>
                  <TableHead className="w-28">Артикул</TableHead>
                  <TableHead className="w-28 text-right">Кол-во</TableHead>
                  <TableHead className="w-28 text-right">Резерв</TableHead>
                  <TableHead className="w-28 text-right">Доступно</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Нет позиций на складе
                    </TableCell>
                  </TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{item.product_code}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.reserved > 0 ? (
                        <Badge variant="secondary">{item.reserved}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={item.available === 0 ? "text-destructive" : ""}>
                        {item.available}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setDetailItem(item)}>
                        <Eye className="size-3.5" />
                      </Button>
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

      {detailItem && (
        <StockDetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  )
}

function StockDetailDialog({ item, onClose }: { item: StockItemType; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock-movements", item.id],
    queryFn: () => purchasingApi.stockMovements(item.id),
  })

  const [receiveQty, setReceiveQty] = useState("")
  const [receiveComment, setReceiveComment] = useState("")

  const receiveMutation = useMutation({
    mutationFn: (data: { quantity: number; comment?: string }) =>
      purchasingApi.stockReceive(item.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] })
      qc.invalidateQueries({ queryKey: ["stock-movements", item.id] })
      toast.success("Приход оформлен")
      setReceiveQty("")
      setReceiveComment("")
    },
    onError: () => toast.error("Ошибка"),
  })

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{item.product_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="border rounded-lg p-3">
            <p className="text-2xl font-bold">{item.quantity}</p>
            <p className="text-xs text-muted-foreground">На складе</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-2xl font-bold">{item.reserved}</p>
            <p className="text-xs text-muted-foreground">Резерв</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-2xl font-bold">{item.available}</p>
            <p className="text-xs text-muted-foreground">Доступно</p>
          </div>
        </div>

        <div className="flex items-end gap-2 border-t pt-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Приход</label>
            <Input
              type="number" min={1} placeholder="Кол-во"
              value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)}
              className="h-8 w-24"
            />
          </div>
          <Input
            placeholder="Комментарий" value={receiveComment}
            onChange={(e) => setReceiveComment(e.target.value)}
            className="h-8 flex-1"
          />
          <Button size="sm" disabled={!receiveQty || receiveMutation.isPending}
            onClick={() => receiveMutation.mutate({ quantity: Number(receiveQty), comment: receiveComment })}
          >
            <ArrowDownToLine className="size-3.5 mr-1" /> Оформить приход
          </Button>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">История движений</h4>
          {isLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="max-h-[300px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead>Заказ</TableHead>
                    <TableHead>Кто</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">Нет движений</TableCell>
                    </TableRow>
                  ) : movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {STOCK_MOVEMENT_TYPES[m.movement_type] ?? m.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                      <TableCell className="text-sm">{m.order_number ? `#${m.order_number}` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.user_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("ru")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
