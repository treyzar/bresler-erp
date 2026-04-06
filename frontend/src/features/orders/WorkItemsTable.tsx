import { useState, useEffect } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { OfferWorkItem } from "@/api/types"
import { useWorkItems, useUpdateWorkItems } from "@/api/hooks/useSpecs"

interface WorkItemsTableProps {
  offerId: number
}

export function WorkItemsTable({ offerId }: WorkItemsTableProps) {
  const { data: items, isLoading } = useWorkItems(offerId)
  const updateMutation = useUpdateWorkItems(offerId)
  const [localItems, setLocalItems] = useState<OfferWorkItem[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (items) {
      setLocalItems(items)
      setDirty(false)
    }
  }, [items])

  const updateItem = (idx: number, field: keyof OfferWorkItem, value: unknown) => {
    setLocalItems(localItems.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    ))
    setDirty(true)
  }

  const handleSave = () => {
    const payload = localItems.map((item) => ({
      id: item.id,
      included: item.included,
      days: item.days,
      specialists: item.specialists,
      trips: item.trips,
    }))
    updateMutation.mutate(payload, {
      onSuccess: () => { toast.success("Работы сохранены"); setDirty(false) },
      onError: () => toast.error("Ошибка сохранения"),
    })
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  if (localItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Нет работ. Добавьте виды работ в справочник и создайте КП заново.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="size-3.5 mr-1" />
            {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Вкл</TableHead>
              <TableHead>Вид работ</TableHead>
              <TableHead className="w-24">Дни</TableHead>
              <TableHead className="w-24">Спец.</TableHead>
              <TableHead className="w-24">Выезды</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localItems.map((item, idx) => (
              <TableRow key={item.id} className={!item.included ? "opacity-50" : ""}>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.included}
                    onCheckedChange={(v) => updateItem(idx, "included", !!v)}
                  />
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {item.work_type_name}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={item.days}
                    onChange={(e) => updateItem(idx, "days", parseInt(e.target.value) || 1)}
                    className="h-8 text-sm"
                    disabled={!item.included}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={item.specialists}
                    onChange={(e) => updateItem(idx, "specialists", parseInt(e.target.value) || 1)}
                    className="h-8 text-sm"
                    disabled={!item.included}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={item.trips}
                    onChange={(e) => updateItem(idx, "trips", parseInt(e.target.value) || 1)}
                    className="h-8 text-sm"
                    disabled={!item.included}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
