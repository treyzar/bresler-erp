import { useState } from "react"
import { Link as RouterLink } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { Link2, Plus, Trash2, FileText, Building2, User, Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import apiClient from "@/api/client"

interface DocumentLinkData {
  id: number
  source_model: string
  source_id: number
  source_repr: string
  target_model: string
  target_id: number
  target_repr: string
  link_type: string
  note: string
}

interface LinkedDocumentsProps {
  sourceModel: string
  sourceId: number
  /** Можно ли создавать новые связи. По умолчанию true. */
  canEdit?: boolean
}

const modelIcons: Record<string, typeof FileText> = {
  order: FileText,
  contract: FileText,
  orgunit: Building2,
  contact: User,
  letter: Mail,
  facility: Building2,
  document: FileText,
}

const modelLabels: Record<string, string> = {
  order: "Заказ",
  contract: "Контракт",
  orgunit: "Организация",
  contact: "Контакт",
  letter: "Письмо",
  facility: "Объект",
  document: "Документ ЭДО",
}

const modelLinks: Record<string, (id: number) => string> = {
  order: () => "", // Orders use order_number, not id — skip navigation
  contract: () => "",
  orgunit: () => "/directory/orgunits",
  contact: () => "/directory/contacts",
  letter: (id) => `/edo/registry/${id}`,
  document: (id) => `/edo/documents/${id}`,
}

export function LinkedDocuments({ sourceModel, sourceId, canEdit = true }: LinkedDocumentsProps) {
  const qc = useQueryClient()
  const KEY = ["links", sourceModel, sourceId]

  const { data: links = [] } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: DocumentLinkData[] } | DocumentLinkData[]>(
        "/links/",
        { params: { source_model: sourceModel, source_id: sourceId } }
      )
      return Array.isArray(data) ? data : data.results
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/links/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="size-4" />
          Связанные документы ({links.length})
        </CardTitle>
        {canEdit && (
          <LinkPickerDialog
            sourceModel={sourceModel}
            sourceId={sourceId}
            existingLinks={links}
            onCreated={() => qc.invalidateQueries({ queryKey: KEY })}
          />
        )}
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Связей нет.</p>
        ) : (
          <div className="space-y-1">
            {links.map((link) => {
              const isSource = link.source_model === sourceModel && link.source_id === sourceId
              const otherModel = isSource ? link.target_model : link.source_model
              const otherId = isSource ? link.target_id : link.source_id
              const otherRepr = isSource ? link.target_repr : link.source_repr
              const Icon = modelIcons[otherModel] || FileText
              const label = modelLabels[otherModel] || otherModel
              const linkBuilder = modelLinks[otherModel]
              const href = linkBuilder ? linkBuilder(otherId) : ""

              const inner = (
                <>
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <Badge variant="outline" className="text-[10px] shrink-0">{label}</Badge>
                  <span className="text-sm truncate">{otherRepr}</span>
                </>
              )

              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group"
                >
                  {href ? (
                    <RouterLink to={href} className="flex items-center gap-2 min-w-0 flex-1 hover:underline">
                      {inner}
                    </RouterLink>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 flex-1">{inner}</div>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteMutation.mutate(link.id)}
                      title="Удалить связь"
                    >
                      <Trash2 className="size-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


interface DocumentSearchHit {
  id: number
  number: string
  title: string
  type_name: string
}

/** Диалог выбора целевого EDO-документа по номеру/заголовку. Создаёт связь
 *  source → target (link_type=related). Самосвязки и дубли не создаём. */
function LinkPickerDialog({
  sourceModel, sourceId, existingLinks, onCreated,
}: {
  sourceModel: string
  sourceId: number
  existingLinks: DocumentLinkData[]
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["link-picker", "documents", query],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: DocumentSearchHit[] }>(
        "/edo/internal/documents/",
        { params: { search: query, page_size: 20 } },
      )
      return Array.isArray(data) ? data : (data.results ?? [])
    },
    enabled: open && query.trim().length >= 2,
    staleTime: 5_000,
  })

  const create = useMutation({
    mutationFn: async (target: DocumentSearchHit) => {
      // Запрет самосвязки и дублей.
      if (sourceModel === "document" && target.id === sourceId) {
        throw new Error("Нельзя связать документ сам с собой")
      }
      const dup = existingLinks.some((l) => {
        const t1 = l.target_model === "document" && l.target_id === target.id
        const t2 = l.source_model === "document" && l.source_id === target.id
        return t1 || t2
      })
      if (dup) throw new Error("Связь уже существует")

      await apiClient.post("/links/", {
        source_model: sourceModel,
        source_id: sourceId,
        target_model: "document",
        target_id: target.id,
        link_type: "related",
      })
    },
    onSuccess: () => {
      toast.success("Связь создана")
      setOpen(false)
      setQuery("")
      onCreated()
    },
    onError: (e: AxiosError<{ detail?: string }>) =>
      toast.error(e.response?.data?.detail ?? e.message ?? "Ошибка"),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Plus className="mr-1 h-3.5 w-3.5" />Связать
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Связать с документом ЭДО</DialogTitle>
          <DialogDescription>
            Найдите документ по номеру или заголовку (минимум 2 символа).
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: СЗ-СВОБ или Командировка"
        />
        <div className="max-h-72 overflow-y-auto border rounded-md">
          {query.trim().length < 2 ? (
            <p className="text-sm text-muted-foreground italic p-3">
              Введите 2+ символа для поиска
            </p>
          ) : isFetching ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : hits.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-3">Ничего не найдено.</p>
          ) : (
            <ul className="divide-y">
              {hits.map((hit) => (
                <li
                  key={hit.id}
                  className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 cursor-pointer"
                  onClick={() => create.mutate(hit)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-muted-foreground">{hit.number}</div>
                    <div className="text-sm truncate">{hit.title || hit.type_name}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{hit.type_name}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
