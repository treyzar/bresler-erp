import { useState, useEffect, useMemo } from "react"
import { Plus, Trash2, Download, Save, PackagePlus, GripVertical, Copy } from "lucide-react"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ProductNameInput } from "@/components/shared/ProductNameInput"
import apiClient from "@/api/client"
import type {
  PaginatedResponse, Product, DeviceRZA, ModRZA,
  SpecificationLine, CommercialOfferListItem, ShipmentBatch,
} from "@/api/types"
import { useSpecification, useUpdateSpecification, useFillSpecification } from "@/api/hooks/useSpecs"
import { useDebounce } from "@/hooks/useDebounce"

interface SpecificationEditorProps {
  offerId: number
  orderId: number
  vatRate: number
  onExport: () => void
  shipmentBatches?: ShipmentBatch[]
}

// ── Search hooks ────────────────────────────────────────────────

function useProductSearch(search: string) {
  const debouncedSearch = useDebounce(search, 300)
  return useQuery({
    queryKey: ["products-search", debouncedSearch],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>(
        "/devices/products/", { params: { search: debouncedSearch, page_size: 50, is_active: true } },
      )
      return data.results
    },
    enabled: debouncedSearch.length >= 2,
  })
}

function useDeviceRZASearch(search: string) {
  const debouncedSearch = useDebounce(search, 300)
  return useQuery({
    queryKey: ["device-rza-search", debouncedSearch],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DeviceRZA>>(
        "/devices/rza/", { params: { search: debouncedSearch, page_size: 50 } },
      )
      return data.results
    },
    enabled: debouncedSearch.length >= 2,
  })
}

function useModRZASearch(deviceRzaId: number | null, search: string) {
  const debouncedSearch = useDebounce(search, 300)
  return useQuery({
    queryKey: ["mod-rza-search", deviceRzaId, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, unknown> = { page_size: 50 }
      if (deviceRzaId) params.device_rza = deviceRzaId
      if (debouncedSearch) params.search = debouncedSearch
      const { data } = await apiClient.get<PaginatedResponse<ModRZA>>(
        "/devices/modifications/", { params },
      )
      return data.results
    },
    enabled: !!deviceRzaId || debouncedSearch.length >= 2,
  })
}

// ── Sortable row ────────────────────────────────────────────────

function SortableRow({
  line, idx, updateLine, updateLineMulti, removeLine, shipmentBatches,
}: {
  line: SpecificationLine
  idx: number
  updateLine: (idx: number, field: keyof SpecificationLine, value: unknown) => void
  updateLineMulti: (idx: number, updates: Partial<SpecificationLine>) => void
  removeLine: (idx: number) => void
  shipmentBatches?: ShipmentBatch[]
}) {
  const sortableId = line.id ? `line-${line.id}` : `new-${idx}`
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: sortableId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const catalogLabel = [
    line.device_rza_name,
    line.mod_rza_name,
    line.product_name,
  ].filter(Boolean).join(" / ")

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="size-3.5 text-muted-foreground" />
      </TableCell>
      <TableCell className="text-center font-mono text-xs w-10">
        {line.line_number}
      </TableCell>
      <TableCell className="min-w-[250px]">
        <ProductNameInput
          value={line.name}
          productId={line.product}
          onChange={(name, productId, basePrice) => {
            const updates: Partial<SpecificationLine> = { name, product: productId }
            if (basePrice && productId) updates.unit_price = basePrice
            updateLineMulti(idx, updates)
          }}
          className="h-8 text-sm"
        />
        {catalogLabel && (
          <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
            {catalogLabel}
          </span>
        )}
      </TableCell>
      <TableCell className="w-20">
        <Input
          type="number"
          min={1}
          value={line.quantity}
          onChange={(e) => updateLine(idx, "quantity", parseInt(e.target.value) || 1)}
          className="h-8 text-sm w-full"
        />
      </TableCell>
      <TableCell className="w-36">
        <Input
          type="number"
          step="0.01"
          min={0}
          value={line.unit_price}
          onChange={(e) => updateLine(idx, "unit_price", e.target.value)}
          className="h-8 text-sm w-full"
        />
      </TableCell>
      <TableCell className="w-36 font-medium text-sm text-right">
        {Number(line.total_price).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="w-36">
        <Input
          type="date"
          value={line.delivery_date ?? ""}
          onChange={(e) => updateLine(idx, "delivery_date", e.target.value || null)}
          className="h-8 text-sm w-full"
        />
      </TableCell>
      {shipmentBatches && shipmentBatches.length > 0 && (
        <TableCell className="w-32">
          <Select
            value={line.shipment_batch?.toString() ?? "none"}
            onValueChange={(v) => updateLine(idx, "shipment_batch", v === "none" ? null : Number(v))}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {shipmentBatches.map((b) => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  Партия {b.batch_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      )}
      <TableCell className="w-10">
        <Button
          variant="ghost" size="icon" className="size-7"
          onClick={() => removeLine(idx)}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ── Main editor ─────────────────────────────────────────────────

export function SpecificationEditor({ offerId, orderId, vatRate, onExport, shipmentBatches }: SpecificationEditorProps) {
  const { data: spec, isLoading } = useSpecification(offerId)
  const updateMutation = useUpdateSpecification(offerId)
  const [lines, setLines] = useState<SpecificationLine[]>([])
  const [dirty, setDirty] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [fillOfferOpen, setFillOfferOpen] = useState(false)

  useEffect(() => {
    if (spec?.lines) {
      setLines(spec.lines)
      setDirty(false)
    }
  }, [spec])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sortableIds = useMemo(
    () => lines.map((l, idx) => l.id ? `line-${l.id}` : `new-${idx}`),
    [lines],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortableIds.indexOf(String(active.id))
    const newIndex = sortableIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(lines, oldIndex, newIndex).map((l, i) => ({
      ...l,
      line_number: i + 1,
    }))
    setLines(reordered)
    setDirty(true)
  }

  const addLine = () => {
    const nextNum = lines.length > 0 ? Math.max(...lines.map((l) => l.line_number)) + 1 : 1
    setLines([...lines, {
      line_number: nextNum,
      product: null,
      device_rza: null,
      mod_rza: null,
      name: "",
      quantity: 1,
      unit_price: "0.00",
      total_price: "0.00",
      delivery_date: null,
      shipment_batch: null,
      note: "",
    }])
    setDirty(true)
  }

  const addFromCatalog = (newLines: SpecificationLine[]) => {
    setLines([...lines, ...newLines])
    setDirty(true)
    setCatalogOpen(false)
  }

  const removeLine = (idx: number) => {
    const updated = lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, line_number: i + 1 }))
    setLines(updated)
    setDirty(true)
  }

  const updateLine = (idx: number, field: keyof SpecificationLine, value: unknown) => {
    setLines(lines.map((line, i) => {
      if (i !== idx) return line
      const updated = { ...line, [field]: value }
      if (field === "quantity" || field === "unit_price") {
        const qty = field === "quantity" ? Number(value) : Number(updated.quantity)
        const price = field === "unit_price" ? Number(value) : Number(updated.unit_price)
        updated.total_price = (qty * price).toFixed(2)
      }
      return updated
    }))
    setDirty(true)
  }

  const updateLineMulti = (idx: number, updates: Partial<SpecificationLine>) => {
    setLines(lines.map((line, i) => {
      if (i !== idx) return line
      const updated = { ...line, ...updates }
      const qty = Number(updated.quantity)
      const price = Number(updated.unit_price)
      updated.total_price = (qty * price).toFixed(2)
      return updated
    }))
    setDirty(true)
  }

  const handleSave = () => {
    updateMutation.mutate(lines, {
      onSuccess: () => { toast.success("Спецификация сохранена"); setDirty(false) },
      onError: () => toast.error("Ошибка сохранения"),
    })
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const totalNoVat = lines.reduce((s, l) => s + Number(l.total_price), 0)
  const vatAmount = totalNoVat * (vatRate / 100)
  const totalWithVat = totalNoVat + vatAmount

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="size-3.5 mr-1" /> Добавить позицию
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCatalogOpen(true)}>
            <PackagePlus className="size-3.5 mr-1" /> Из каталога
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFillOfferOpen(true)}>
            <Copy className="size-3.5 mr-1" /> Из другого КП
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="size-3.5 mr-1" /> DOCX
          </Button>
          {dirty && (
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="size-3.5 mr-1" />
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-10">N</TableHead>
                <TableHead className="min-w-[250px]">Наименование</TableHead>
                <TableHead className="w-20">Кол-во</TableHead>
                <TableHead className="w-36">Цена за ед.</TableHead>
                <TableHead className="w-36">Итого</TableHead>
                <TableHead className="w-36">Срок поставки</TableHead>
                {shipmentBatches && shipmentBatches.length > 0 && (
                  <TableHead className="w-32">Партия</TableHead>
                )}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={shipmentBatches?.length ? 9 : 8} className="h-24 text-center text-muted-foreground">
                    Нет позиций. Нажмите &laquo;Добавить позицию&raquo; или &laquo;Из каталога&raquo;.
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {lines.map((line, idx) => (
                    <SortableRow
                      key={line.id ?? `new-${idx}`}
                      line={line}
                      idx={idx}
                      updateLine={updateLine}
                      updateLineMulti={updateLineMulti}
                      removeLine={removeLine}
                      shipmentBatches={shipmentBatches}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {lines.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1 min-w-[300px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Итого без НДС:</span>
              <span className="font-medium">{totalNoVat.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">НДС ({vatRate}%):</span>
              <span className="font-medium">{vatAmount.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Итого с НДС:</span>
              <span>{totalWithVat.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.</span>
            </div>
          </div>
        </div>
      )}

      {/* Catalog picker (Products + DeviceRZA + ModRZA) */}
      <CatalogPickerDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onSelect={addFromCatalog}
        existingProductIds={lines.filter((l) => l.product).map((l) => l.product!)}
        lastLineNumber={lines.length > 0 ? Math.max(...lines.map((l) => l.line_number)) : 0}
      />

      {/* Fill from another offer */}
      <FillFromOfferDialog
        open={fillOfferOpen}
        onOpenChange={setFillOfferOpen}
        offerId={offerId}
        orderId={orderId}
      />
    </div>
  )
}

// ── Catalog picker dialog (Products + DeviceRZA + ModRZA) ───────

function CatalogPickerDialog({
  open, onOpenChange, onSelect, existingProductIds, lastLineNumber,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (lines: SpecificationLine[]) => void
  existingProductIds: number[]
  lastLineNumber: number
}) {
  const [tab, setTab] = useState<"products" | "devices">("products")
  const [search, setSearch] = useState("")
  const [modSearch, setModSearch] = useState("")
  const [selectedDeviceRza, setSelectedDeviceRza] = useState<DeviceRZA | null>(null)

  // Product search
  const { data: products = [], isLoading: productsLoading } = useProductSearch(
    tab === "products" ? search : "",
  )
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())

  // Device RZA search
  const { data: devices = [], isLoading: devicesLoading } = useDeviceRZASearch(
    tab === "devices" ? search : "",
  )

  // ModRZA search
  const { data: modifications = [], isLoading: modsLoading } = useModRZASearch(
    selectedDeviceRza?.id ?? null,
    modSearch,
  )
  const [selectedMods, setSelectedMods] = useState<Map<number, { device: DeviceRZA; mod: ModRZA | null }>>(new Map())

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearch("")
      setModSearch("")
      setSelectedProducts(new Set())
      setSelectedMods(new Map())
      setSelectedDeviceRza(null)
      setTab("products")
    }
  }, [open])

  const toggleProduct = (id: number) => {
    const next = new Set(selectedProducts)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedProducts(next)
  }

  const selectDeviceWithoutMod = (device: DeviceRZA) => {
    const key = -device.id // negative key = device without mod
    const next = new Map(selectedMods)
    if (next.has(key)) next.delete(key); else next.set(key, { device, mod: null })
    setSelectedMods(next)
  }

  const selectMod = (device: DeviceRZA, mod: ModRZA) => {
    const next = new Map(selectedMods)
    if (next.has(mod.id)) next.delete(mod.id); else next.set(mod.id, { device, mod })
    setSelectedMods(next)
  }

  const totalSelected = selectedProducts.size + selectedMods.size

  const handleConfirm = () => {
    const newLines: SpecificationLine[] = []
    let num = lastLineNumber

    // Products
    products.filter((p) => selectedProducts.has(p.id)).forEach((p) => {
      num++
      newLines.push({
        line_number: num,
        product: p.id,
        product_name: p.name,
        device_rza: null,
        mod_rza: null,
        name: p.name,
        quantity: 1,
        unit_price: p.base_price || "0.00",
        total_price: p.base_price || "0.00",
        delivery_date: null,
        shipment_batch: null,
        note: "",
      })
    })

    // Devices/Mods
    selectedMods.forEach(({ device, mod }) => {
      num++
      const name = mod
        ? `${device.rza_name} ${mod.mod_name}`
        : device.rza_name
      newLines.push({
        line_number: num,
        product: null,
        device_rza: device.id,
        device_rza_name: device.rza_name,
        mod_rza: mod?.id ?? null,
        mod_rza_name: mod?.mod_name ?? null,
        name,
        quantity: 1,
        unit_price: "0.00",
        total_price: "0.00",
        delivery_date: null,
        shipment_batch: null,
        note: "",
      })
    })

    onSelect(newLines)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Добавить из каталога</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "products" | "devices"); setSearch("") }}>
          <TabsList>
            <TabsTrigger value="products">Продукция</TabsTrigger>
            <TabsTrigger value="devices">Устройства РЗА</TabsTrigger>
          </TabsList>

          {/* ── Products tab ── */}
          <TabsContent value="products" className="space-y-3 mt-3">
            <Input
              placeholder="Поиск по названию или артикулу (мин. 2 символа)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <ScrollArea className="h-[400px] rounded-md border">
              {productsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : products.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  {search.length < 2 ? "Введите минимум 2 символа для поиска" : "Ничего не найдено"}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Наименование</TableHead>
                      <TableHead className="w-32">Артикул</TableHead>
                      <TableHead className="w-32">Цена</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => {
                      const alreadyAdded = existingProductIds.includes(p.id)
                      return (
                        <TableRow
                          key={p.id}
                          className={alreadyAdded ? "opacity-40" : "cursor-pointer"}
                          onClick={() => !alreadyAdded && toggleProduct(p.id)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.has(p.id)}
                              disabled={alreadyAdded}
                              onCheckedChange={() => !alreadyAdded && toggleProduct(p.id)}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{p.name}</TableCell>
                          <TableCell className="text-sm font-mono">{p.internal_code}</TableCell>
                          <TableCell className="text-sm text-right">
                            {Number(p.base_price).toLocaleString("ru-RU")} {p.currency}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Devices tab ── */}
          <TabsContent value="devices" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Left: Device RZA list */}
              <div className="space-y-2">
                <Input
                  placeholder="Поиск устройства РЗА..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedDeviceRza(null); setModSearch("") }}
                  autoFocus
                />
                <ScrollArea className="h-[350px] rounded-md border">
                  {devicesLoading ? (
                    <div className="p-4 space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : devices.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">
                      {search.length < 2 ? "Введите мин. 2 символа" : "Не найдено"}
                    </p>
                  ) : (
                    <div className="p-1">
                      {devices.map((d) => (
                        <div
                          key={d.id}
                          className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer hover:bg-muted/50 ${
                            selectedDeviceRza?.id === d.id ? "bg-muted" : ""
                          }`}
                          onClick={() => { setSelectedDeviceRza(d); setModSearch("") }}
                        >
                          <Checkbox
                            checked={selectedMods.has(-d.id)}
                            onCheckedChange={(checked) => {
                              if (checked) selectDeviceWithoutMod(d)
                              else {
                                const next = new Map(selectedMods)
                                next.delete(-d.id)
                                setSelectedMods(next)
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{d.rza_name}</div>
                            <div className="text-[10px] text-muted-foreground">{d.rza_code}</div>
                          </div>
                          {(d.modifications_count ?? 0) > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {d.modifications_count} мод.
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Right: Modifications list */}
              <div className="space-y-2">
                <Input
                  placeholder={selectedDeviceRza ? `Модификации ${selectedDeviceRza.rza_short_name || selectedDeviceRza.rza_code}...` : "Выберите устройство слева"}
                  value={modSearch}
                  onChange={(e) => setModSearch(e.target.value)}
                  disabled={!selectedDeviceRza}
                />
                <ScrollArea className="h-[350px] rounded-md border">
                  {!selectedDeviceRza ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">
                      Выберите устройство РЗА слева для просмотра модификаций
                    </p>
                  ) : modsLoading ? (
                    <div className="p-4 space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : modifications.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">Нет модификаций</p>
                  ) : (
                    <div className="p-1">
                      {modifications.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 p-2 rounded text-sm cursor-pointer hover:bg-muted/50"
                          onClick={() => selectMod(selectedDeviceRza, m)}
                        >
                          <Checkbox
                            checked={selectedMods.has(m.id)}
                            onCheckedChange={() => selectMod(selectedDeviceRza, m)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{m.mod_name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {m.full_code || m.mod_code}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Выбрано: {totalSelected}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button onClick={handleConfirm} disabled={totalSelected === 0}>
              Добавить ({totalSelected})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Fill from another offer dialog ──────────────────────────────

function useOfferSearch(search: string) {
  const debouncedSearch = useDebounce(search, 300)
  return useQuery({
    queryKey: ["offers-search", debouncedSearch],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<CommercialOfferListItem>>(
        "/offers/", { params: { search: debouncedSearch, page_size: 30 } },
      )
      return data.results
    },
    enabled: debouncedSearch.length >= 2,
  })
}

function FillFromOfferDialog({
  open, onOpenChange, offerId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  offerId: number
  orderId: number
}) {
  const fillMutation = useFillSpecification(offerId)
  const [search, setSearch] = useState("")
  const { data: offers = [], isLoading } = useOfferSearch(search)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    if (open) { setSearch(""); setSelectedId(null) }
  }, [open])

  // Exclude current offer
  const filteredOffers = offers.filter((o) => o.id !== offerId)

  const handleFill = () => {
    if (!selectedId) return
    fillMutation.mutate(
      { source_type: "offer", source_offer_id: selectedId },
      {
        onSuccess: () => {
          toast.success("Спецификация заполнена из другого КП")
          onOpenChange(false)
        },
        onError: () => toast.error("Ошибка заполнения"),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Заполнить из другого КП</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Поиск по номеру КП из любого заказа. Текущие позиции будут заменены.
        </p>

        <Input
          placeholder="Поиск по номеру КП (мин. 2 символа)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <ScrollArea className="h-[300px] rounded-md border">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredOffers.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              {search.length < 2 ? "Введите минимум 2 символа для поиска" : "Ничего не найдено"}
            </p>
          ) : (
            <div className="p-1 space-y-1">
              {filteredOffers.map((o) => (
                <div
                  key={o.id}
                  className={`p-2.5 rounded cursor-pointer text-sm transition-colors ${
                    selectedId === o.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                  onClick={() => setSelectedId(o.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{o.offer_number}</span>
                    <span className="text-xs text-muted-foreground">v{o.version}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{o.participant_name}</span>
                    <span>{new Date(o.date).toLocaleDateString("ru")}</span>
                    {o.total_amount && (
                      <span className="font-medium text-foreground">
                        {Number(o.total_amount).toLocaleString("ru-RU")} руб.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button
            onClick={handleFill}
            disabled={!selectedId || fillMutation.isPending}
          >
            {fillMutation.isPending ? "Заполнение..." : "Заполнить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
