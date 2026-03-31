import { useState } from "react"
import { useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link2, Plus, Trash2, FileText, Building2, User, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
}

const modelIcons: Record<string, typeof FileText> = {
  order: FileText,
  contract: FileText,
  orgunit: Building2,
  contact: User,
  letter: Mail,
  facility: Building2,
}

const modelLabels: Record<string, string> = {
  order: "Заказ",
  contract: "Контракт",
  orgunit: "Организация",
  contact: "Контакт",
  letter: "Письмо",
  facility: "Объект",
}

const modelLinks: Record<string, (id: number) => string> = {
  order: () => "", // Orders use order_number, not id — skip navigation
  contract: () => "",
  orgunit: () => "/directory/orgunits",
  contact: () => "/directory/contacts",
  letter: (id) => `/edo/registry/${id}`,
}

export function LinkedDocuments({ sourceModel, sourceId }: LinkedDocumentsProps) {
  const navigate = useNavigate()
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

  if (links.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="size-4" />
          Связанные документы ({links.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {links.map((link) => {
            // Determine which side is the "other" document
            const isSource = link.source_model === sourceModel && link.source_id === sourceId
            const otherModel = isSource ? link.target_model : link.source_model
            const otherId = isSource ? link.target_id : link.source_id
            const otherRepr = isSource ? link.target_repr : link.source_repr
            const Icon = modelIcons[otherModel] || FileText
            const label = modelLabels[otherModel] || otherModel

            return (
              <div
                key={link.id}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <Badge variant="outline" className="text-[10px] shrink-0">{label}</Badge>
                  <span className="text-sm truncate">{otherRepr}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteMutation.mutate(link.id)}
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
