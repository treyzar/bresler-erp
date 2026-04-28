import { useState } from "react"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PARAMETER_TYPES } from "@/api/types"
import { deviceRZAApi } from "@/api/devicesApi"
import { useAddDeviceParameter } from "@/api/hooks/useDevices"
import { useQuery } from "@tanstack/react-query"

interface Props {
  deviceId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddParameterDialog({ deviceId, open, onOpenChange }: Props) {
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [price, setPrice] = useState("0")

  const { data: available = [], isLoading } = useQuery({
    queryKey: ["device-rza", "available-parameters", deviceId],
    queryFn: () => deviceRZAApi.availableParameters(deviceId),
    enabled: open,
  })

  const addMutation = useAddDeviceParameter()

  const filtered = search
    ? available.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : available

  const handleAdd = async () => {
    if (!selectedId) return
    try {
      await addMutation.mutateAsync({
        deviceId,
        parameterId: selectedId,
        price: Number(price) || 0,
      })
      toast.success("Параметр привязан")
      setSelectedId(null)
      setPrice("0")
      onOpenChange(false)
    } catch {
      toast.error("Ошибка привязки параметра")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить параметр к устройству</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Поиск параметра..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-md max-h-60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Параметр</TableHead>
                <TableHead className="w-28">Тип</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Нет доступных параметров
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    className={`cursor-pointer ${selectedId === p.id ? "bg-accent" : ""}`}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PARAMETER_TYPES[p.parameter_type] || p.parameter_type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {selectedId && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground shrink-0">Цена:</label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">₽</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleAdd} disabled={!selectedId || addMutation.isPending}>
            Привязать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
