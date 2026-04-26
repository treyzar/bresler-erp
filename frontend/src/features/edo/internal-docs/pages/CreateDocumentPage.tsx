import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { ChevronLeft, Save, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DynamicField } from "../components/DynamicField"
import { useAutoCompute } from "../hooks/useAutoCompute"
import { internalDocsApi } from "../api/client"
import type { FieldSpec } from "../api/types"

export function CreateDocumentPage() {
  const { code = "" } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const { data: type, isLoading } = useQuery({
    queryKey: ["internal-docs", "type", code],
    queryFn: () => internalDocsApi.getType(code),
    enabled: !!code,
  })

  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  useAutoCompute(code, values, setValues)

  const create = useMutation({
    mutationFn: async (submitAfter: boolean) => {
      const doc = await internalDocsApi.createDocument({
        type: code, field_values: values,
      })
      if (submitAfter) {
        return await internalDocsApi.submitDocument(doc.id)
      }
      return doc
    },
    onSuccess: (doc) => {
      toast.success(doc.status === "pending" ? "Документ отправлен на согласование" : "Черновик сохранён")
      navigate(`/edo/documents/${doc.id}`)
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail ?? e?.message ?? "Ошибка"
      toast.error(detail)
    },
  })

  if (isLoading || !type) {
    return <div className="container mx-auto p-6 max-w-3xl"><Skeleton className="h-96" /></div>
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    for (const spec of type.field_schema) {
      if (spec.required) {
        const v = values[spec.name]
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
        if (empty) next[spec.name] = "Обязательное поле"
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSave = (submit: boolean) => {
    if (submit && !validate()) {
      toast.error("Заполните обязательные поля")
      return
    }
    create.mutate(submit)
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/new">
          <ChevronLeft className="mr-2 h-4 w-4" />К каталогу типов
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{type.name}</h1>
        {type.description && <p className="text-muted-foreground mt-1">{type.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Заполнить поля</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {type.field_schema.map((spec: FieldSpec) => (
            <DynamicField
              key={spec.name}
              spec={spec}
              value={values[spec.name]}
              onChange={(v) => setValues((prev) => ({ ...prev, [spec.name]: v }))}
              error={errors[spec.name]}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Цепочка согласования</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {type.default_chain.steps.map((s) => (
              <li key={s.order} className="flex items-start gap-3 text-sm">
                <span className="flex-none w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                  {s.order}
                </span>
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-muted-foreground text-xs">
                    {s.action === "inform" ? "Для информации" : "Требуется согласование"}
                    {s.sla_hours ? ` · SLA ${s.sla_hours}ч` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border shadow-sm">
        <Button variant="outline" onClick={() => onSave(false)} disabled={create.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Сохранить черновик
        </Button>
        <Button onClick={() => onSave(true)} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Отправить на согласование
        </Button>
      </div>
    </div>
  )
}
