import { useState, useEffect } from "react"
import { Plus, Trash2, Save, ArrowRight, Settings2, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Collapsible, CollapsibleContent,
} from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ProductNameInput } from "@/components/shared/ProductNameInput"
import type { CalculationLine, OfferWorkItem } from "@/api/types"
import { OVERHEAD_TYPES, OVERHEAD_DEFAULTS, PRICING_MODES } from "@/api/types"
import {
  useCalculation, useUpdateCalculation, useApplyCalcDefaults, useCalcToSpecification,
  useWorkItems, useUpdateWorkItems,
} from "@/api/hooks/useSpecs"

interface CalculationEditorProps {
  offerId: number
  deliveryIncluded: boolean
  deliveryCity: string
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

export function CalculationEditor({ offerId, deliveryIncluded, deliveryCity }: CalculationEditorProps) {
  const { data: calcData, isLoading } = useCalculation(offerId)
  const updateMutation = useUpdateCalculation(offerId)
  const applyDefaultsMutation = useApplyCalcDefaults(offerId)
  const toSpecMutation = useCalcToSpecification(offerId)

  // Work items from the offer
  const { data: workItemsData } = useWorkItems(offerId)
  const updateWorksMutation = useUpdateWorkItems(offerId)

  const [lines, setLines] = useState<CalculationLine[]>([])
  const [defaults, setDefaults] = useState({
    default_overhead_percent: "15",
    default_project_coeff: "1",
    default_discount_coeff: "1",
  })
  const [deliveryPrice, setDeliveryPrice] = useState("0")
  const [deliveryPricingMode, setDeliveryPricingMode] = useState("separate")
  const [localWorkItems, setLocalWorkItems] = useState<OfferWorkItem[]>([])
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
      setDeliveryPrice(calcData.delivery_price)
      setDeliveryPricingMode(calcData.delivery_pricing_mode)
      setDirty(false)
    }
  }, [calcData])

  useEffect(() => {
    if (workItemsData) setLocalWorkItems(workItemsData)
  }, [workItemsData])

  const addLine = () => {
    const nextNum = lines.length > 0 ? Math.max(...lines.map((l) => l.line_number)) + 1 : 1
    setLines([...lines, calc({
      line_number: nextNum,
      product: null, device_rza: null, mod_rza: null,
      name: "", quantity: 1,
      is_optional: false, option_type: "none", pricing_mode: "separate", parent_line: null,
      base_price: "0.00", overhead_type: "equipment",
      overhead_percent: defaults.default_overhead_percent,
      price_with_overhead: "0.00",
      project_coeff: defaults.default_project_coeff,
      estimated_price: "0.00",
      discount_coeff: defaults.default_discount_coeff,
      discounted_price: "0.00", total_price: "0.00", note: "",
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
      if (field === "overhead_type") {
        updated.overhead_percent = String(OVERHEAD_DEFAULTS[value as string] ?? 0)
      }
      return calc(updated)
    }))
    setDirty(true)
  }

  const updateWorkItem = (idx: number, field: keyof OfferWorkItem, value: unknown) => {
    setLocalWorkItems(localWorkItems.map((w, i) => i === idx ? { ...w, [field]: value } : w))
    setDirty(true)
  }

  const handleSave = async () => {
    // Save calc lines + delivery
    await updateMutation.mutateAsync({
      ...defaults,
      delivery_price: deliveryPrice,
      delivery_pricing_mode: deliveryPricingMode,
      lines,
    })
    // Save work item prices
    const worksPayload = localWorkItems
      .filter((w) => w.included)
      .map((w) => ({ id: w.id, unit_price: w.unit_price, pricing_mode: w.pricing_mode }))
    if (worksPayload.length > 0) {
      await updateWorksMutation.mutateAsync(worksPayload)
    }
    toast.success("Расчёт сохранён")
    setDirty(false)
  }

  const handleApplyDefaults = () => {
    applyDefaultsMutation.mutate(undefined, {
      onSuccess: () => toast.success("Коэффициенты применены"),
    })
  }

  const handleToSpec = () => {
    toSpecMutation.mutate(undefined, {
      onSuccess: () => { toast.success("Спецификация заполнена из расчёта"); setConfirmToSpec(false) },
      onError: () => toast.error("Ошибка"),
    })
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const totalEquipment = lines.reduce((s, l) => s + Number(l.total_price), 0)
  const totalDelivery = deliveryIncluded ? Number(deliveryPrice) || 0 : 0
  const totalWorks = localWorkItems
    .filter((w) => w.included && Number(w.unit_price) > 0)
    .reduce((s, w) => s + Number(w.unit_price), 0)
  const grandTotal = totalEquipment + totalDelivery + totalWorks

  const includedWorks = localWorkItems.filter((w) => w.included)

  return (
    <div className="space-y-6">
      {/* ── Toolbar ── */}
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
          <Button variant="outline" size="sm" onClick={() => setConfirmToSpec(true)} disabled={lines.length === 0}>
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

      {/* ── Defaults panel ── */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleContent>
          <div className="border rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">НР по умолчанию, %</Label>
                <Input type="number" step="0.01" value={defaults.default_overhead_percent}
                  onChange={(e) => { setDefaults({ ...defaults, default_overhead_percent: e.target.value }); setDirty(true) }}
                  className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Проектный К</Label>
                <Input type="number" step="0.0001" value={defaults.default_project_coeff}
                  onChange={(e) => { setDefaults({ ...defaults, default_project_coeff: e.target.value }); setDirty(true) }}
                  className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Скидочный К</Label>
                <Input type="number" step="0.0001" value={defaults.default_discount_coeff}
                  onChange={(e) => { setDefaults({ ...defaults, default_discount_coeff: e.target.value }); setDirty(true) }}
                  className="h-8 text-sm" />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleApplyDefaults} disabled={applyDefaultsMutation.isPending}>
              Применить ко всем позициям
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Main equipment table ── */}
      <div>
        <h4 className="text-sm font-medium mb-2">Оборудование</h4>
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
                <TableHead className="w-24">Цена с НР</TableHead>
                <TableHead className="w-20">Пр. К</TableHead>
                <TableHead className="w-24">Сметная</TableHead>
                <TableHead className="w-20">Ск. К</TableHead>
                <TableHead className="w-24">Со скидкой</TableHead>
                <TableHead className="w-24">Итого</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-20 text-center text-muted-foreground">
                    Нет позиций
                  </TableCell>
                </TableRow>
              ) : lines.map((line, idx) => (
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
                    <Input type="number" min={1} value={line.quantity}
                      onChange={(e) => updateLine(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="h-7 text-xs w-full" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" value={line.base_price}
                      onChange={(e) => updateLine(idx, "base_price", e.target.value)}
                      className="h-7 text-xs w-full" />
                  </TableCell>
                  <TableCell>
                    <Select value={line.overhead_type} onValueChange={(v) => updateLine(idx, "overhead_type", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(OVERHEAD_TYPES).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" value={line.overhead_percent}
                      onChange={(e) => updateLine(idx, "overhead_percent", e.target.value)}
                      className="h-7 text-xs w-full" disabled={line.overhead_type !== "custom"} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {Number(line.price_with_overhead).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.0001" value={line.project_coeff}
                      onChange={(e) => updateLine(idx, "project_coeff", e.target.value)}
                      className="h-7 text-xs w-full" />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {Number(line.estimated_price).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.0001" value={line.discount_coeff}
                      onChange={(e) => updateLine(idx, "discount_coeff", e.target.value)}
                      className="h-7 text-xs w-full" />
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
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Options section ── */}
      <div>
        <h4 className="text-sm font-medium mb-2">Опции</h4>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Наименование</TableHead>
                <TableHead className="w-28">Стоимость</TableHead>
                <TableHead className="w-36">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 cursor-help">
                        Режим <HelpCircle className="size-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs">
                        <p className="font-medium mb-1">Как стоимость опции попадёт в спецификацию:</p>
                        <p><strong>Отдельная строка</strong> — отдельной позицией в спецификации со своей ценой</p>
                        <p className="mt-1"><strong>Включено в стоимость</strong> — не выделяется отдельно, подразумевается что цена уже заложена в оборудование</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="w-24">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Delivery row */}
              <TableRow className={!deliveryIncluded ? "opacity-40" : ""}>
                <TableCell className="text-sm">
                  Доставка{deliveryCity ? ` до ${deliveryCity}` : ""}
                </TableCell>
                <TableCell>
                  <Input
                    type="number" step="0.01"
                    value={deliveryPrice}
                    onChange={(e) => { setDeliveryPrice(e.target.value); setDirty(true) }}
                    className="h-7 text-xs w-full"
                    disabled={!deliveryIncluded}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={deliveryPricingMode}
                    onValueChange={(v) => { setDeliveryPricingMode(v); setDirty(true) }}
                    disabled={!deliveryIncluded}
                  >
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRICING_MODES).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={deliveryIncluded ? "default" : "outline"} className="text-[10px]">
                    {deliveryIncluded ? "Включена" : "Не включена"}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* Work items rows */}
              {localWorkItems.map((wi, idx) => (
                <TableRow key={wi.id} className={!wi.included ? "opacity-40" : ""}>
                  <TableCell className="text-sm">{wi.work_type_name}</TableCell>
                  <TableCell>
                    <Input
                      type="number" step="0.01"
                      value={wi.unit_price}
                      onChange={(e) => updateWorkItem(idx, "unit_price", e.target.value)}
                      className="h-7 text-xs w-full"
                      disabled={!wi.included}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={wi.pricing_mode}
                      onValueChange={(v) => updateWorkItem(idx, "pricing_mode", v)}
                      disabled={!wi.included}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRICING_MODES).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={wi.included ? "default" : "outline"} className="text-[10px]">
                      {wi.included ? "Включено" : "Не включено"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {!deliveryIncluded && includedWorks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-12 text-center text-muted-foreground text-xs">
                    Доставка не включена в КП, работы не выбраны
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Totals ── */}
      <div className="flex justify-end">
        <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1 min-w-[350px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Оборудование:</span>
            <span>{totalEquipment.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
          </div>
          {deliveryIncluded && totalDelivery > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Доставка:</span>
              <span>{totalDelivery.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
            </div>
          )}
          {totalWorks > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Работы:</span>
              <span>{totalWorks.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Итого:</span>
            <span>{grandTotal.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmToSpec}
        onOpenChange={setConfirmToSpec}
        title="Перенести в спецификацию?"
        description="Текущие позиции спецификации будут заменены. Опции в режиме «отдельная строка» станут отдельными строками спецификации."
        onConfirm={handleToSpec}
        loading={toSpecMutation.isPending}
      />
    </div>
  )
}
