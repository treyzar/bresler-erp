import { useNavigate, useParams } from "react-router"
import { useState } from "react"
import { Pencil, Trash2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ORDER_STATUSES } from "@/api/types"
import { useOrder, useDeleteOrder } from "@/api/hooks/useOrders"
import { useOrderPresence } from "@/hooks/useOrderPresence"
import { ContractSection } from "./ContractSection"
import { OrderFilesSection } from "./OrderFilesSection"
import { OrderHistorySection } from "./OrderHistorySection"

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const navigate = useNavigate()
  const orderNum = Number(orderNumber)
  const { data: order, isLoading } = useOrder(orderNum)
  const deleteMutation = useDeleteOrder()
  const activeUsers = useOrderPresence(orderNumber)
  const [showDelete, setShowDelete] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(orderNum)
      toast.success("Заказ удалён")
      navigate("/orders", { replace: true })
    } catch {
      toast.error("Ошибка при удалении")
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Заказ не найден</p>
      </div>
    )
  }

  const statusLabel = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] ?? order.status

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
            <ArrowLeft className="size-4 mr-1" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold">Заказ #{order.order_number}</h1>
          <Badge>{statusLabel}</Badge>
          {activeUsers.size > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs text-muted-foreground">Сейчас смотрят:</span>
              {[...activeUsers].map((username) => (
                <Badge key={username} variant="outline" className="text-xs">
                  {username}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${orderNum}/edit`)}>
            <Pencil className="size-4 mr-1" />
            Редактировать
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="size-4 mr-1" />
            Удалить
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="contract">Контракт</TabsTrigger>
          <TabsTrigger value="files">
            Файлы {order.files.length > 0 && `(${order.files.length})`}
          </TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Номер заказа" value={String(order.order_number)} />
                <InfoRow label="Номер тендера" value={order.tender_number} />
                <InfoRow label="Статус" value={statusLabel} />
                <InfoRow label="Дата начала" value={order.start_date} />
                <InfoRow label="Дата отгрузки" value={order.ship_date} />
                <InfoRow label="Создан" value={new Date(order.created_at).toLocaleString("ru")} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Связи</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Заказчик" value={order.customer_name} />
                <InfoRow label="Посредник" value={order.intermediary_name} />
                <InfoRow label="Проектант" value={order.designer_name} />
                <InfoRow label="Организации" value={order.order_org_units.map((o) => o.org_unit_name).join(", ")} />
                <InfoRow label="Участники ЦЗ" value={order.order_participants.map((p) => p.org_unit_name).join(", ")} />
              </CardContent>
            </Card>
            {order.note && (
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Примечание</CardTitle></CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{order.note}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contract" className="mt-4">
          <ContractSection orderId={orderNum} contract={order.contract} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <OrderFilesSection orderId={orderNum} files={order.files} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <OrderHistorySection orderId={orderNum} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Удалить заказ?"
        description={`Заказ #${order.order_number} будет удалён безвозвратно.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  )
}
