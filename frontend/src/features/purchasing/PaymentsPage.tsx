import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CreditCard, Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { purchasingApi } from "@/api/purchasingApi"
import { PAYMENT_STATUSES } from "@/api/types"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending_approval: "secondary",
  approved: "default",
  paid: "default",
  rejected: "destructive",
}

export function PaymentsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)

  const params: Record<string, unknown> = { page, page_size: 20 }
  if (statusFilter !== "all") params.status = statusFilter

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-payments-list", params],
    queryFn: () => purchasingApi.paymentList(params),
  })

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: () => purchasingApi.paymentPending(),
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => purchasingApi.paymentApprove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-payments-list"] })
      qc.invalidateQueries({ queryKey: ["pending-payments"] })
      toast.success("Согласовано")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => purchasingApi.paymentReject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-payments-list"] })
      qc.invalidateQueries({ queryKey: ["pending-payments"] })
      toast.success("Отклонено")
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => purchasingApi.paymentMarkPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-payments-list"] })
      toast.success("Отмечено как оплачено")
    },
  })

  const payments = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <CreditCard className="size-6" />
        <h1 className="text-2xl font-bold">Оплаты закупок</h1>
        {data && <Badge variant="secondary">{data.count}</Badge>}
      </div>

      {pendingPayments.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              На согласовании
              <Badge variant="secondary">{pendingPayments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div>
                  <div className="text-sm font-medium">
                    {Number(p.amount).toLocaleString("ru-RU")} руб. — {p.supplier_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.invoice_number && `Счёт ${p.invoice_number}`}
                    {p.due_date && ` · Срок: ${new Date(p.due_date).toLocaleDateString("ru")}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending}>
                    <Check className="size-3.5 mr-1 text-green-600" /> Согласовать
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(p.id)} disabled={rejectMutation.isPending}>
                    <X className="size-3.5 mr-1 text-destructive" /> Отклонить
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
        <SelectTrigger className="w-[200px]"><SelectValue placeholder="Все статусы" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          {Object.entries(PAYMENT_STATUSES).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead className="w-28">Счёт</TableHead>
                  <TableHead className="w-32 text-right">Сумма</TableHead>
                  <TableHead className="w-28">Срок</TableHead>
                  <TableHead className="w-28">Статус</TableHead>
                  <TableHead className="w-36">Согласовал</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Нет оплат</TableCell></TableRow>
                ) : payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.id}</TableCell>
                    <TableCell>{p.supplier_name}</TableCell>
                    <TableCell className="text-sm">{p.invoice_number || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{Number(p.amount).toLocaleString("ru-RU")}</TableCell>
                    <TableCell className="text-sm">{p.due_date ? new Date(p.due_date).toLocaleDateString("ru") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[p.status] ?? "outline"}>
                        {PAYMENT_STATUSES[p.status] ?? p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.approved_by_name || "—"}</TableCell>
                    <TableCell>
                      {p.status === "approved" && (
                        <Button size="sm" variant="ghost" onClick={() => markPaidMutation.mutate(p.id)}>
                          Оплачено
                        </Button>
                      )}
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
    </div>
  )
}
