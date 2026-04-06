import { useState } from "react"
import { Plus, Copy, Download, Trash2, FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { OrderParticipantEntry, CommercialOfferListItem } from "@/api/types"
import { OFFER_STATUSES, PAYMENT_TERMS } from "@/api/types"
import { useOfferList, useDeleteOffer, useCopyOffer } from "@/api/hooks/useSpecs"
import { specsApi } from "@/api/specsApi"
import { OfferFormDialog } from "./OfferFormDialog"
import { OfferDetailDialog } from "./OfferDetailDialog"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  sent: "secondary",
  accepted: "default",
  rejected: "destructive",
  expired: "outline",
}

interface OffersTabProps {
  orderId: number
  orderNumber: number
  participants: OrderParticipantEntry[]
}

export function OffersTab({ orderId, orderNumber, participants }: OffersTabProps) {
  const { data, isLoading } = useOfferList(orderId)
  const deleteMutation = useDeleteOffer(orderId)
  const copyMutation = useCopyOffer(orderId)

  const [createOpen, setCreateOpen] = useState(false)
  const [detailOfferId, setDetailOfferId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CommercialOfferListItem | null>(null)

  const offers = data?.results ?? []

  // Group offers by participant
  const grouped = participants.map((p) => ({
    participant: p,
    offers: offers.filter((o) => o.participant === p.id),
  }))

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("КП удалено"); setDeleteTarget(null) },
      onError: () => toast.error("Ошибка удаления"),
    })
  }

  const handleCopy = (offer: CommercialOfferListItem) => {
    copyMutation.mutate(
      { offerId: offer.id, participantId: offer.participant },
      {
        onSuccess: () => toast.success("КП скопировано"),
        onError: () => toast.error("Ошибка копирования"),
      },
    )
  }

  const handleExport = async (offerId: number) => {
    try {
      await specsApi.exportOffer(offerId)
    } catch {
      toast.error("Ошибка экспорта")
    }
  }

  if (participants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Добавьте участников запроса в форме редактирования заказа, чтобы создавать КП.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Коммерческие предложения</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-1" />
          Создать КП
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ participant, offers: pOffers }) => (
            <Card key={participant.id}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{participant.order_index}
                  </Badge>
                  {participant.org_unit_name}
                  <span className="text-muted-foreground text-sm font-normal ml-auto">
                    {pOffers.length} КП
                  </span>
                </CardTitle>
              </CardHeader>
              {pOffers.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {pOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setDetailOfferId(offer.id)}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{offer.offer_number}</span>
                            <Badge variant="outline" className="text-[10px]">v{offer.version}</Badge>
                            <Badge variant={statusVariant[offer.status] ?? "outline"} className="text-[10px]">
                              {OFFER_STATUSES[offer.status as keyof typeof OFFER_STATUSES] ?? offer.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(offer.date).toLocaleDateString("ru")}</span>
                            {offer.valid_until && (
                              <span>до {new Date(offer.valid_until).toLocaleDateString("ru")}</span>
                            )}
                            <span>{PAYMENT_TERMS[offer.payment_terms as keyof typeof PAYMENT_TERMS] ?? offer.payment_terms}</span>
                            {offer.total_amount && (
                              <span className="font-medium text-foreground">
                                {Number(offer.total_amount).toLocaleString("ru")} руб.
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => handleCopy(offer)} title="Копировать">
                            <Copy className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => handleExport(offer.id)} title="Скачать DOCX">
                            <Download className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setDeleteTarget(offer)} title="Удалить">
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <OfferFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        orderId={orderId}
        participants={participants}
      />

      {/* Detail dialog */}
      {detailOfferId && (
        <OfferDetailDialog
          offerId={detailOfferId}
          orderId={orderId}
          participants={participants}
          onClose={() => setDetailOfferId(null)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Удалить КП?"
        description={`КП ${deleteTarget?.offer_number} будет удалено без возможности восстановления.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
