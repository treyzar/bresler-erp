import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ClipboardList, Send, Eye } from "lucide-react"
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
import { purchasingApi } from "@/api/purchasingApi"
import { PURCHASE_REQUEST_STATUSES } from "@/api/types"
import { useDebounce } from "@/hooks/useDebounce"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "secondary",
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
}

export function PurchaseRequestsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const params: Record<string, unknown> = { page, search: debouncedSearch, page_size: 20 }
  if (statusFilter !== "all") params.status = statusFilter

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-requests", params],
    queryFn: () => purchasingApi.requestList(params),
  })

  const submitMutation = useMutation({
    mutationFn: (id: number) => purchasingApi.requestSubmit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-requests"] })
      toast.success("Заявка подана")
    },
    onError: () => toast.error("Ошибка"),
  })

  const requests = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="size-6" />
          <h1 className="text-2xl font-bold">Заявки на закупку</h1>
          {data && <Badge variant="secondary">{data.count}</Badge>}
        </div>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Поиск..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Все статусы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(PURCHASE_REQUEST_STATUSES).map(([k, v]) => (
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
                  <TableHead className="w-24">Заказ</TableHead>
                  <TableHead>Создал</TableHead>
                  <TableHead className="w-28">Статус</TableHead>
                  <TableHead className="w-28">Треб. дата</TableHead>
                  <TableHead className="w-20 text-right">Позиций</TableHead>
                  <TableHead className="w-28">Создана</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Нет заявок</TableCell></TableRow>
                ) : requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.id}</TableCell>
                    <TableCell>#{r.order_number}</TableCell>
                    <TableCell className="text-sm">{r.created_by_name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status] ?? "outline"}>
                        {PURCHASE_REQUEST_STATUSES[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.required_date ? new Date(r.required_date).toLocaleDateString("ru") : "—"}</TableCell>
                    <TableCell className="text-right">{r.lines_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ru")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => setDetailId(r.id)}>
                          <Eye className="size-3.5" />
                        </Button>
                        {r.status === "draft" && (
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => submitMutation.mutate(r.id)}>
                            <Send className="size-3.5 text-primary" />
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

      {detailId && <RequestDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

function RequestDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: request, isLoading } = useQuery({
    queryKey: ["purchase-request", id],
    queryFn: () => purchasingApi.requestDetail(id),
  })

  if (isLoading || !request) return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent aria-describedby={undefined}><Skeleton className="h-32 w-full" /></DialogContent>
    </Dialog>
  )

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Заявка #{request.id} → Заказ #{request.order_number}
            <Badge variant={statusVariant[request.status] ?? "outline"}>
              {PURCHASE_REQUEST_STATUSES[request.status] ?? request.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Создал:</span> {request.created_by_name}</div>
          {request.required_date && <div><span className="text-muted-foreground">Треб. дата:</span> {new Date(request.required_date).toLocaleDateString("ru")}</div>}
          {request.note && <div><span className="text-muted-foreground">Примечание:</span> {request.note}</div>}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Наименование</TableHead>
              <TableHead className="w-20 text-right">Кол-во</TableHead>
              <TableHead>Назначение</TableHead>
              <TableHead className="w-24 text-right">На складе</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {request.lines.map((l, i) => (
              <TableRow key={l.id ?? i}>
                <TableCell>{l.name}</TableCell>
                <TableCell className="text-right">{l.quantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.target_description || "—"}</TableCell>
                <TableCell className="text-right">
                  {l.stock_available !== null && l.stock_available !== undefined ? (
                    <Badge variant={l.stock_available >= l.quantity ? "default" : "destructive"}>
                      {l.stock_available}
                    </Badge>
                  ) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}
