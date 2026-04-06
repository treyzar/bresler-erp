import { useState, useEffect } from "react"
import { FileDown } from "lucide-react"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { COMPANY_ENTITIES } from "@/api/types"
import type { DocumentTemplate } from "@/api/types"
import { ordersApi } from "@/api/ordersApi"

interface GenerateDocumentDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  orderNumber: number
}

export function GenerateDocumentDialog({ open, onOpenChange, orderNumber }: GenerateDocumentDialogProps) {
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [extraData, setExtraData] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["document-templates", entityFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (entityFilter !== "all") params.entity = entityFilter
      return ordersApi.listTemplates(params)
    },
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      setSelectedTemplate(null)
      setExtraData({})
    }
  }, [open])

  const handleGenerate = async () => {
    if (!selectedTemplate) return
    setGenerating(true)
    try {
      await ordersApi.generateDocument(orderNumber, selectedTemplate.id, extraData)
      toast.success("Документ сформирован")
      onOpenChange(false)
    } catch {
      toast.error("Ошибка генерации документа")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Сформировать документ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entity filter */}
          <div className="space-y-1.5">
            <Label>Предприятие</Label>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setSelectedTemplate(null) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все предприятия</SelectItem>
                {Object.entries(COMPANY_ENTITIES).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template list */}
          <div className="space-y-1.5">
            <Label>Шаблон документа</Label>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет доступных шаблонов. Загрузите шаблоны через админку.
              </p>
            ) : (
              <div className="space-y-1 max-h-[250px] overflow-auto rounded-md border p-1">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded cursor-pointer text-sm transition-colors ${
                      selectedTemplate?.id === t.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                    onClick={() => setSelectedTemplate(t)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t.name}</span>
                      <Badge variant="outline" className="text-[10px]">{t.entity_display}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{t.document_type_display}</span>
                      {t.description && (
                        <span className="text-xs text-muted-foreground">— {t.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extra data fields (optional overrides) */}
          {selectedTemplate && (
            <div className="space-y-3 border rounded-lg p-3">
              <Label className="text-xs text-muted-foreground">Дополнительные данные (необязательно)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Дата документа</Label>
                  <Input
                    type="date"
                    value={extraData.document_date ?? ""}
                    onChange={(e) => setExtraData({ ...extraData, document_date: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Номер документа</Label>
                  <Input
                    value={extraData.document_number ?? ""}
                    onChange={(e) => setExtraData({ ...extraData, document_number: e.target.value })}
                    placeholder="Авто"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Примечание</Label>
                  <Input
                    value={extraData.extra_note ?? ""}
                    onChange={(e) => setExtraData({ ...extraData, extra_note: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleGenerate} disabled={!selectedTemplate || generating}>
            <FileDown className="size-3.5 mr-1" />
            {generating ? "Формирование..." : "Сформировать"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
