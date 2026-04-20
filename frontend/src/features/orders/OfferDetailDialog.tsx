import { useState } from "react"
import { Download, Pencil, Save, X } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  OFFER_STATUSES, PAYMENT_TERMS, MANUFACTURING_PERIODS,
  WARRANTY_MONTHS_OPTIONS,
} from "@/api/types"
import type { CommercialOfferDetail, OrderParticipantEntry, ShipmentBatch } from "@/api/types"
import { useOffer, useUpdateOffer } from "@/api/hooks/useSpecs"
import { specsApi } from "@/api/specsApi"
import { WorkItemsTable } from "./WorkItemsTable"
import { SpecificationEditor } from "./SpecificationEditor"
import { CalculationEditor } from "./CalculationEditor"
import { ParticipantContacts } from "./ParticipantContacts"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  sent: "secondary",
  accepted: "default",
  rejected: "destructive",
  expired: "outline",
}

interface OfferDetailDialogProps {
  offerId: number
  orderId: number
  participants: OrderParticipantEntry[]
  shipmentBatches?: ShipmentBatch[]
  onClose: () => void
}

export function OfferDetailDialog({ offerId, orderId, participants, shipmentBatches, onClose }: OfferDetailDialogProps) {
  const { data: offer, isLoading } = useOffer(offerId)
  const updateMutation = useUpdateOffer(offerId, orderId)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<Partial<CommercialOfferDetail>>({})

  if (isLoading || !offer) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh]" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Загрузка КП...</DialogTitle></DialogHeader>
          <Skeleton className="h-96 w-full" />
        </DialogContent>
      </Dialog>
    )
  }

  const startEdit = () => {
    setEditValues({
      status: offer.status,
      vat_rate: offer.vat_rate,
      payment_terms: offer.payment_terms,
      manufacturing_period: offer.manufacturing_period,
      warranty_months: offer.warranty_months,
    })
    setEditing(true)
  }

  const saveEdit = () => {
    updateMutation.mutate(editValues, {
      onSuccess: () => { toast.success("КП обновлено"); setEditing(false) },
      onError: () => toast.error("Ошибка сохранения"),
    })
  }

  const handleExportOffer = async () => {
    try {
      await specsApi.exportOffer(offerId)
    } catch {
      toast.error("Ошибка экспорта КП")
    }
  }

  const handleExportSpec = async () => {
    try {
      await specsApi.exportSpecification(offerId)
    } catch {
      toast.error("Ошибка экспорта спецификации")
    }
  }

  const vatRate = Number(offer.vat_rate) || 0

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              КП {offer.offer_number}
              <Badge variant="outline" className="text-xs">v{offer.version}</Badge>
              <Badge variant={statusVariant[offer.status] ?? "outline"}>
                {OFFER_STATUSES[offer.status as keyof typeof OFFER_STATUSES]}
              </Badge>
            </DialogTitle>
            <div className="flex items-center gap-1">
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={startEdit}>
                  <Pencil className="size-3.5 mr-1" /> Редактировать
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    <X className="size-3.5 mr-1" /> Отмена
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                    <Save className="size-3.5 mr-1" /> Сохранить
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleExportOffer}>
                <Download className="size-3.5 mr-1" /> DOCX
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="conditions">
          <TabsList>
            <TabsTrigger value="conditions">Условия</TabsTrigger>
            <TabsTrigger value="calculation">Расчёт</TabsTrigger>
            <TabsTrigger value="specification">
              Спецификация
              {offer.specification && ` (${offer.specification.lines.length})`}
            </TabsTrigger>
            <TabsTrigger value="works">Работы</TabsTrigger>
            <TabsTrigger value="contacts">Контакты</TabsTrigger>
          </TabsList>

          {/* ── Conditions tab ── */}
          <TabsContent value="conditions" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Участник" value={offer.participant_name} />
              <InfoRow label="Дата" value={new Date(offer.date).toLocaleDateString("ru")} />
              <InfoRow label="Действует до" value={offer.valid_until ? new Date(offer.valid_until).toLocaleDateString("ru") : "—"} />
              <InfoRow
                label="Менеджеры"
                value={offer.order_managers?.length ? offer.order_managers.join(", ") : (offer.manager_name || "—")}
              />
              <InfoRow label="Исполнитель" value={offer.executor_name || "—"} />
              {offer.based_on_number && <InfoRow label="На основании" value={offer.based_on_number} />}
            </div>

            <Separator />

            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Статус</Label>
                  <Select value={editValues.status} onValueChange={(v) => setEditValues({ ...editValues, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OFFER_STATUSES).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Условия оплаты</Label>
                  <Select value={editValues.payment_terms} onValueChange={(v) => setEditValues({ ...editValues, payment_terms: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_TERMS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Срок изготовления</Label>
                  <Select value={editValues.manufacturing_period} onValueChange={(v) => setEditValues({ ...editValues, manufacturing_period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MANUFACTURING_PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>{p} дней</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Гарантия</Label>
                  <Select value={String(editValues.warranty_months)} onValueChange={(v) => setEditValues({ ...editValues, warranty_months: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WARRANTY_MONTHS_OPTIONS.map((m) => (
                        <SelectItem key={m} value={String(m)}>{m} мес.</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="НДС" value={`${offer.vat_rate}%`} />
                <InfoRow label="Условия оплаты" value={PAYMENT_TERMS[offer.payment_terms as keyof typeof PAYMENT_TERMS] ?? offer.payment_terms} />
                <InfoRow label="Аванс" value={`${offer.advance_percent}%`} />
                <InfoRow label="Перед отгрузкой" value={`${offer.pre_shipment_percent}%`} />
                <InfoRow label="Постоплата" value={`${offer.post_payment_percent}%`} />
                <InfoRow label="Срок изготовления" value={`${offer.manufacturing_period} дней`} />
                <InfoRow label="Гарантия" value={`${offer.warranty_months} мес.`} />
                <InfoRow label="Доставка" value={offer.delivery_included ? `Включена (${offer.delivery_city || "—"})` : "Не включена"} />
              </div>
            )}

            {offer.additional_conditions && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Дополнительные условия</span>
                  <p className="text-sm whitespace-pre-wrap">{offer.additional_conditions}</p>
                </div>
              </>
            )}

            <Separator />
            <div className="bg-muted/30 p-3 rounded-lg text-sm italic">
              {offer.shipment_condition_text}
            </div>

            {offer.specification && (
              <div className="flex items-center gap-4 text-sm font-medium">
                <span>Итого без НДС: {Number(offer.specification.total_amount).toLocaleString("ru-RU")} руб.</span>
                <span>С НДС: {Number(offer.specification.total_amount_with_vat).toLocaleString("ru-RU")} руб.</span>
              </div>
            )}
          </TabsContent>

          {/* ── Calculation tab ── */}
          <TabsContent value="calculation" className="mt-4">
            <CalculationEditor
              offerId={offerId}
              deliveryIncluded={offer.delivery_included}
              deliveryCity={offer.delivery_city}
            />
          </TabsContent>

          {/* ── Specification tab ── */}
          <TabsContent value="specification" className="mt-4">
            <SpecificationEditor
              offerId={offerId}
              orderId={orderId}
              vatRate={vatRate}
              onExport={handleExportSpec}
              shipmentBatches={shipmentBatches}
            />
          </TabsContent>

          {/* ── Works tab ── */}
          <TabsContent value="works" className="mt-4">
            <WorkItemsTable offerId={offerId} />
          </TabsContent>

          {/* ── Contacts tab ── */}
          <TabsContent value="contacts" className="mt-4">
            <ParticipantContacts participants={participants.filter((p) => p.id === offer.participant)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
