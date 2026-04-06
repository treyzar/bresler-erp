import { useState, useEffect } from "react"
import { Plus, Trash2, Save, ArrowRight, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ProductNameInput } from "@/components/shared/ProductNameInput"
import type { CalculationLine } from "@/api/types"
import { OVERHEAD_TYPES, OVERHEAD_DEFAULTS } from "@/api/types"
import {
  useCalculation, useUpdateCalculation, useApplyCalcDefaults, useCalcToSpecification,
} from "@/api/hooks/useSpecs"

interface CalculationEditorProps {
  offerId: number
}

function calc(line: CalculationLine): CalculationLine {
  const bp = Number(line.base_price) || 0
  const oh = Number(line.overhead_percent) || 0
  const pk = Number(line.project_coeff) || 1
  const dk = Number(line.discount_coeff) || 1
  const qty = Number(line.quantity) || 1
  const pwo = bp * (1 + oh / 100)
  const est = pwo * pk
  const disc = est * dk
  return {
    ...line,
    price_with_overhead: pwo.toFixed(2),
    estimated_price: est.toFixed(2),
    discounted_price: disc.toFixed(2),
    total_price: (qty * disc).toFixed(2),
  }
}

export function CalculationEditor({ offerId }: CalculationEditorProps) {
  const { data: calcData, isLoading } = useCalculation(offerId)
  const updateMutation = useUpdateCalculation(offerId)
  const applyDefaultsMutation = useApplyCalcDefaults(offerId)
  const toSpecMutation = useCalcToSpecification(offerId)

  const [lines, setLines] = useState<CalculationLine[]>([])
  const [defaults, setDefaults] = useState({
    default_overhead_percent: "15",
    default_project_coeff: "1",
    default_discount_coeff: "1",
  })
  const [dirty, setDirty] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmToSpec, setConfirmToSpec] = useState(false)

  useEffect(() => {
    if (calcData) {
      setLines(calcData.lines)
      setDefaults({
        default_overhead_percent: calcData.default_overhead_percent,
        default_project_coeff: calcData.default_project_coeff,
        default_discount_coeff: calcData.default_discount_coeff,
      })
      setDirty(false)
    }
  }, [calcData])

  const addLine = () => {
    const nextNum = lines.length > 0 ? Math.max(...lines.map((l) => l.line_number)) + 1 : 1
    setLines([...lines, calc({
      line_number: nextNum,
      product: null,
      device_rza: null,
      mod_rza: null,
      name: "",
      quantity: 1,
      base_price: "0.00",
      overhead_type: "equipment",
      overhead_percent: defaults.default_overhead_percent,
      price_with_overhead: "0.00",
      project_coeff: defaults.default_project_coeff,
      estimated_price: "0.00",
      discount_coeff: defaults.default_discount_coeff,
      discounted_price: "0.00",
      total_price: "0.00",
      note: "",
    })])
    setDirty(true)
  }

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, line_number: i + 1 })))
    setDirty(true)
  }

  const updateLine = (idx: number, field: keyof CalculationLine, value: unknown) => {
    setLines(lines.map((line, i) => {
      if (i !== idx) return line
      const updated = { ...line, [field]: value }
      // When overhead_type changes, update overhead_percent
      if (field === "overhead_type") {
        updated.overhead_percent = String(OVERHEAD_DEFAULTS[value as string] ?? 0)
      }
      return calc(updated)
    }))
    setDirty(true)
  }

  const handleSave = () => {
    updateMutation.mutate({ ...defaults, lines }, {
      onSuccess: () => { toast.success("Расчёт сохранён"); setDirty(false) },
      onError: () => toast.error("Ошибка сохранения"),
    })
  }

  const handleApplyDefaults = () => {
    applyDefaultsMutation.mutate(undefined, {
      onSuccess: () => toast.success("Коэффициенты применены ко всем позициям"),
      onError: () => toast.error("Ошибка"),
    })
  }

  const handleToSpec = () => {
    toSpecMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Спецификация заполнена из расчёта")
        setConfirmToSpec(false)
      },
      onError: () => toast.error("Ошибка"),
    })
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const totalBase = lines.reduce((s, l) => s + Number(l.base_price) * l.quantity, 0)
  const totalEstimated = lines.reduce((s, l) => s + Number(l.estimated_price) * l.quantity, 0)
  const totalDiscounted = lines.reduce((s, l) => s + Number(l.total_price), 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="size-3.5 mr-1" /> Добавить позицию
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(!settingsOpen)}>
            <Settings2 className="size-3.5 mr-1" /> Коэффициенты
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setConfirmToSpec(true)}
            disabled={lines.length === 0}
          >
            <ArrowRight className="size-3.5 mr-1" /> В спецификацию
          </Button>
          {dirty && (
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="size-3.5 mr-1" />
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          )}
        </div>
      </div>

      {/* Defaults panel */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleContent>
          <div className="border rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">НР по умолчанию, %</Label>
                <Input
                  type="number" step="0.01"
                  value={defaults.default_overhead_percent}
                  onChange={(e) => { setDefaults({ ...defaults, default_overhead_percent: e.target.value }); setDirty(true) }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Проектный К</Label>
                <Input
                  type="number" step="0.0001"
                  value={defaults.default_project_coeff}
                  onChange={(e) => { setDefaults({ ...defaults, default_project_coeff: e.target.value }); setDirty(true) }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Скидочный К</Label>
                <Input
                  type="number" step="0.0001"
                  value={defaults.default_discount_coeff}
                  onChange={(e) => { setDefaults({ ...defaults, default_discount_coeff: e.target.value }); setDirty(true) }}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleApplyDefaults} disabled={applyDefaultsMutation.isPending}>
              Применить ко всем позициям
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">N</TableHead>
              <TableHead className="min-w-[200px]">Наименование</TableHead>
              <TableHead className="w-16">Кол.</TableHead>
              <TableHead className="w-28">Баз. цена</TableHead>
              <TableHead className="w-28">Тип НР</TableHead>
              <TableHead className="w-16">НР%</TableHead>
              <TableHead className="w-28">Цена с НР</TableHead>
              <TableHead className="w-20">Пр. К</TableHead>
              <TableHead className="w-28">Сметная</TableHead>
              <TableHead className="w-20">Ск. К</TableHead>
              <TableHead className="w-28">Со скидкой</TableHead>
              <TableHead className="w-28">Итого</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                  Нет позиций. Нажмите &laquo;Добавить позицию&raquo;.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line, idx) => (
                <TableRow key={line.id ?? `new-${idx}`}>
                  <TableCell className="text-center font-mono text-xs">{line.line_number}</TableCell>
                  <TableCell>
                    <ProductNameInput
                      value={line.name}
                      productId={line.product}
                      onChange={(name, productId, basePrice) => {
                        const updated = { ...line, name, product: productId }
                        if (basePrice && productId) updated.base_price = basePrice
                        setLines(lines.map((l, i) => i === idx ? calc(updated) : l))
                        setDirty(true)
                      }}
                      className="h-7 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="h-7 text-xs w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" step="0.01"
                      value={line.base_price}
                      onChange={(e) => updateLine(idx, "base_price", e.target.value)}
                      className="h-7 text-xs w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={line.overhead_type} onValueChange={(v) => updateLine(idx, "overhead_type", v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OVERHEAD_TYPES).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" step="0.01"
                      value={line.overhead_percent}
                      onChange={(e) => updateLine(idx, "overhead_percent", e.target.value)}
                      className="h-7 text-xs w-full"
                      disabled={line.overhead_type !== "custom"}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {Number(line.price_with_overhead).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" step="0.0001"
                      value={line.project_coeff}
                      onChange={(e) => updateLine(idx, "project_coeff", e.target.value)}
                      className="h-7 text-xs w-full"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {Number(line.estimated_price).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" step="0.0001"
                      value={line.discount_coeff}
                      onChange={(e) => updateLine(idx, "discount_coeff", e.target.value)}
                      className="h-7 text-xs w-full"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {Number(line.discounted_price).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-right font-semibold">
                    {Number(line.total_price).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => removeLine(idx)}>
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      {lines.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1 min-w-[350px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Итого базовая:</span>
              <span>{totalBase.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Итого сметная:</span>
              <span>{totalEstimated.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Итого со скидкой:</span>
              <span>{totalDiscounted.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirm transfer to spec */}
      <ConfirmDialog
        open={confirmToSpec}
        onOpenChange={setConfirmToSpec}
        title="Перенести в спецификацию?"
        description="Текущие позиции спецификации будут заменены позициями из расчёта. Цена за единицу = цена со скидкой."
        onConfirm={handleToSpec}
        loading={toSpecMutation.isPending}
      />
    </div>
  )
}
