import { useState } from "react"
import { Plus, Trash2, Pencil, Check, X, Package } from "lucide-react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { ShipmentBatch } from "@/api/types"
import { ordersApi } from "@/api/ordersApi"

interface ShipmentsTabProps {
  orderNumber: number
  batches: ShipmentBatch[]
}

export function ShipmentsTab({ orderNumber, batches: initialBatches }: ShipmentsTabProps) {
  const qc = useQueryClient()
  const { data: batches = initialBatches } = useQuery({
    queryKey: ["shipments", orderNumber],
    queryFn: () => ordersApi.getShipments(orderNumber),
    initialData: initialBatches,
  })

  const createMutation = useMutation({
    mutationFn: (payload: { ship_date: string; description?: string }) =>
      ordersApi.createShipment(orderNumber, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments", orderNumber] })
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ShipmentBatch> }) =>
      ordersApi.updateShipment(orderNumber, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments", orderNumber] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ordersApi.deleteShipment(orderNumber, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments", orderNumber] })
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
  })

  const [adding, setAdding] = useState(false)
  const [newDate, setNewDate] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [editId, setEditId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState({ ship_date: "", description: "" })
  const [deleteTarget, setDeleteTarget] = useState<ShipmentBatch | null>(null)

  const handleCreate = () => {
    if (!newDate) { toast.error("Укажите дату отгрузки"); return }
    createMutation.mutate(
      { ship_date: newDate, description: newDesc },
      {
        onSuccess: () => {
          toast.success("Партия добавлена")
          setAdding(false)
          setNewDate("")
          setNewDesc("")
        },
        onError: () => toast.error("Ошибка"),
      },
    )
  }

  const handleUpdate = (id: number) => {
    updateMutation.mutate(
      { id, data: editValues },
      {
        onSuccess: () => { toast.success("Партия обновлена"); setEditId(null) },
        onError: () => toast.error("Ошибка"),
      },
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Партия удалена"); setDeleteTarget(null) },
      onError: () => toast.error("Ошибка"),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Партии отгрузки</h3>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="size-4 mr-1" /> Добавить партию
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Дата отгрузки *</label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-8 w-[180px]" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Описание</label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Описание партии" className="h-8" />
              </div>
              <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Создание..." : "Создать"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Отмена</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batches list */}
      {batches.length === 0 && !adding ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="size-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Нет партий отгрузки</p>
        </div>
      ) : (
        <div className="space-y-2">
          {batches.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <Badge variant="outline" className="text-xs shrink-0">
                Партия {b.batch_number}
              </Badge>

              {editId === b.id ? (
                <>
                  <Input
                    type="date"
                    value={editValues.ship_date}
                    onChange={(e) => setEditValues({ ...editValues, ship_date: e.target.value })}
                    className="h-7 w-[160px] text-sm"
                  />
                  <Input
                    value={editValues.description}
                    onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                    className="h-7 flex-1 text-sm"
                    placeholder="Описание"
                  />
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => handleUpdate(b.id)}>
                    <Check className="size-3.5 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditId(null)}>
                    <X className="size-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">
                    {new Date(b.ship_date).toLocaleDateString("ru")}
                  </span>
                  <span className="text-sm text-muted-foreground flex-1">
                    {b.description || "—"}
                  </span>
                  <Button
                    variant="ghost" size="icon" className="size-7"
                    onClick={() => { setEditId(b.id); setEditValues({ ship_date: b.ship_date, description: b.description }) }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setDeleteTarget(b)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Удалить партию?"
        description={`Партия ${deleteTarget?.batch_number} будет удалена.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
