import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Pencil, ArrowLeft, Check, ArrowRight as ArrowRightIcon, FileDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ORDER_STATUSES, ORDER_TYPES, ORG_UNIT_BUSINESS_ROLES } from "@/api/types"
import { useOrder, useOrderTransitions, useOrderTransition } from "@/api/hooks/useOrders"
import { useOrderPresence } from "@/hooks/useOrderPresence"
import { OrgUnitBreadcrumb } from "@/components/shared/OrgUnitBreadcrumb"
import { ContractSection } from "./ContractSection"
import { OrderFilesSection } from "./OrderFilesSection"
import { OrderHistorySection } from "./OrderHistorySection"
import { OffersTab } from "./OffersTab"
import { GenerateDocumentDialog } from "./GenerateDocumentDialog"
import { ShipmentsTab } from "./ShipmentsTab"
import { Timeline } from "@/components/shared/Timeline"
import { LinkedDocuments } from "@/components/shared/LinkedDocuments"
import { useOrderHistory } from "@/api/hooks/useOrders"

const STATUS_STEPS = [
  { key: "N", label: "Новый" },
  { key: "D", label: "Договор" },
  { key: "P", label: "Производство" },
  { key: "C", label: "Собран" },
  { key: "S", label: "Отгружен" },
] as const

function getStatusStep(status: string): number {
  const map: Record<string, number> = { N: 0, D: 1, P: 2, C: 3, S: 4, A: 4 }
  return map[status] ?? 0
}

function OrderStatusProgress({ status }: { status: string }) {
  const currentStep = getStatusStep(status)
  const totalSteps = STATUS_STEPS.length

  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep
        const isLast = i === totalSteps - 1
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`relative flex items-center justify-center size-8 rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                )}
                {isDone ? <Check className="size-4" /> : i + 1}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mx-2 mb-5">
                <div
                  className={`h-0.5 w-full rounded transition-all ${
                    isDone ? "bg-primary" : "bg-border"
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const navigate = useNavigate()
  const orderNum = Number(orderNumber)
  const { data: order, isLoading } = useOrder(orderNum)
  const { data: historyData, isLoading: historyLoading } = useOrderHistory(orderNum)
  const { data: transitions = [] } = useOrderTransitions(orderNum)
  const transitionMutation = useOrderTransition()
  const activeUsers = useOrderPresence(orderNumber)
  const [generateDocOpen, setGenerateDocOpen] = useState(false)

  const handleTransition = (toStatus: string) => {
    transitionMutation.mutate(
      { orderNumber: orderNum, toStatus },
      {
        onSuccess: () => toast.success("Статус изменён"),
        onError: (err: any) => {
          const detail = err?.response?.data?.detail || "Ошибка смены статуса"
          toast.error(detail)
        },
      }
    )
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
        <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${orderNum}/edit`)}>
          <Pencil className="size-4 mr-1" />
          Редактировать
        </Button>
      </div>

      {/* Status progress + transition buttons */}
      <Card>
        <CardContent className="py-5 px-8 space-y-4">
          <OrderStatusProgress status={order.status} />
          {transitions.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground mr-1">Действия:</span>
              <TooltipProvider>
                {transitions.map((t: any) => {
                  const btn = (
                    <Button
                      key={t.to_status}
                      variant={t.blocked ? "outline" : t.color === "gray" ? "outline" : "default"}
                      size="sm"
                      disabled={t.blocked || transitionMutation.isPending}
                      onClick={() => handleTransition(t.to_status)}
                      className={t.blocked ? "opacity-50" : ""}
                    >
                      <ArrowRightIcon className="size-3.5 mr-1" />
                      {t.label}
                    </Button>
                  )
                  if (t.blocked && t.blocked_reason) {
                    return (
                      <Tooltip key={t.to_status}>
                        <TooltipTrigger asChild>
                          <span>{btn}</span>
                        </TooltipTrigger>
                        <TooltipContent>{t.blocked_reason}</TooltipContent>
                      </Tooltip>
                    )
                  }
                  return btn
                })}
              </TooltipProvider>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked documents */}
      {order.id && <LinkedDocuments sourceModel="order" sourceId={order.id} />}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Основная информация</TabsTrigger>
          <TabsTrigger value="offers">
            ТКП {order.order_participants.length > 0 && `(${order.order_participants.length})`}
          </TabsTrigger>
          <TabsTrigger value="contract">Контракт</TabsTrigger>
          <TabsTrigger value="files">
            Файлы {order.files.length > 0 && `(${order.files.length})`}
          </TabsTrigger>
          <TabsTrigger value="shipments">
            Отгрузки {order.shipment_batches.length > 0 && `(${order.shipment_batches.length})`}
          </TabsTrigger>
          <TabsTrigger value="timeline">Обсуждение</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left column */}
            <div className="space-y-6">
              {/* Общие сведения */}
              <Card>
                <CardHeader><CardTitle>Общие сведения</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Номер заказа" value={String(order.order_number)} />
                  <InfoRow label="Статус" value={statusLabel} />
                  {order.order_type && order.order_type !== "standard" && (
                    <InfoRow label="Тип заказа" value={ORDER_TYPES[order.order_type as keyof typeof ORDER_TYPES] ?? order.order_type} />
                  )}
                  <InfoRow
                    label="Менеджеры"
                    value={order.manager_names.length > 0
                      ? order.manager_names.map((m) => m.name).join(", ")
                      : null}
                  />
                  <InfoRow
                    label="Дата запуска"
                    value={order.start_date ? new Date(order.start_date).toLocaleDateString("ru") : null}
                  />
                  <InfoRow
                    label="Дата отгрузки"
                    value={order.ship_date ? new Date(order.ship_date).toLocaleDateString("ru") : null}
                  />
                  <InfoRow label="Дата создания" value={new Date(order.created_at).toLocaleString("ru")} />
                  {order.related_orders.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <span className="text-sm text-muted-foreground">Связанные заказы</span>
                        <div className="flex flex-wrap gap-1.5">
                          {order.related_orders.map((num) => (
                            <Badge
                              key={num}
                              variant="outline"
                              className="cursor-pointer hover:bg-accent"
                              onClick={() => navigate(`/orders/${num}`)}
                            >
                              #{num}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Сведения об оборудовании и работах */}
              <Card>
                <CardHeader><CardTitle>Сведения об оборудовании и работах</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <TagList label="Оборудование" items={order.equipment_names} />
                  <Separator />
                  <TagList label="Виды работ" items={order.work_names} />
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Организация (структура) */}
              <Card>
                <CardHeader><CardTitle>Организация (структура)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Страна" value={order.country_name} />
                  {order.order_org_units.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Организации</span>
                      {order.order_org_units.map((ou) => (
                        <div key={ou.id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{ou.org_unit_name}</span>
                            {ou.role && (
                              <Badge variant="default" className="text-[11px] shrink-0">
                                {ORG_UNIT_BUSINESS_ROLES[ou.role] ?? ou.role}
                              </Badge>
                            )}
                          </div>
                          <OrgUnitBreadcrumb orgUnitId={ou.org_unit} orgUnitName={ou.org_unit_name} />
                        </div>
                      ))}
                    </div>
                  )}
                  {order.facility_names.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <span className="text-sm text-muted-foreground">Объекты</span>
                        <div className="flex flex-wrap gap-1.5">
                          {order.facility_names.map((f) => (
                            <Badge key={f.id} variant="secondary">
                              {f.org_unit_name ? `${f.name} [${f.org_unit_name}]` : f.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {order.order_participants.length > 0 && (
                    <>
                      <Separator />
                      <InfoRow
                        label="Участники ЦЗ"
                        value={order.order_participants.map((p) => p.org_unit_name).join(", ")}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Сведения о закупке */}
              <Card>
                <CardHeader><CardTitle>Сведения о закупке</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Номер тендера" value={order.tender_number} />
                </CardContent>
              </Card>

              {/* Дополнительные сведения */}
              <Card>
                <CardHeader><CardTitle>Дополнительные сведения</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-sm text-muted-foreground">Контакты</span>
                    {order.contact_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {order.contact_names.map((c) => (
                          <Badge key={c.id} variant="outline">{c.name}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/60">—</p>
                    )}
                  </div>
                  {order.note && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <span className="text-sm text-muted-foreground">Примечание</span>
                        <p className="whitespace-pre-wrap text-sm">{order.note}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="offers" className="mt-4">
          <OffersTab
            orderId={order.id}
            orderNumber={order.order_number}
            participants={order.order_participants}
            shipmentBatches={order.shipment_batches}
          />
        </TabsContent>

        <TabsContent value="contract" className="mt-4">
          <ContractSection orderId={orderNum} contract={order.contract} />
        </TabsContent>

        <TabsContent value="files" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setGenerateDocOpen(true)}>
              <FileDown className="size-3.5 mr-1" /> Сформировать документ
            </Button>
          </div>
          <OrderFilesSection orderId={orderNum} files={order.files} />
          <GenerateDocumentDialog
            open={generateDocOpen}
            onOpenChange={setGenerateDocOpen}
            orderNumber={orderNum}
          />
        </TabsContent>

        <TabsContent value="shipments" className="mt-4">
          <ShipmentsTab orderNumber={orderNum} batches={order.shipment_batches} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Timeline
            targetModel="order"
            targetId={order.id}
            history={historyData}
            historyLoading={historyLoading}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <OrderHistorySection orderId={orderNum} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  )
}

function TagList({ label, items }: { label: string; items: { id: number; name: string }[] }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item.id} variant="secondary">{item.name}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/60">—</p>
      )}
    </div>
  )
}
