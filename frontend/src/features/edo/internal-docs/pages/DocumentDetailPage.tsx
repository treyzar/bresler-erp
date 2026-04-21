import { useState } from "react"
import { Link, useParams, useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft, CheckCircle, XCircle, RotateCcw, FileText,
  Clock, CheckCheck, AlertCircle, Loader2, Trash2, Send,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuthStore } from "@/stores/useAuthStore"
import { internalDocsApi } from "../api/client"
import type { ApprovalStep, DocumentDetail, DocumentStatus } from "../api/types"

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
  revision_requested: "outline",
  cancelled: "outline",
}

const STEP_ICON: Record<ApprovalStep["status"], React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  revision_requested: RotateCcw,
  skipped: CheckCheck,
  delegated: CheckCheck,
}

export function DocumentDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const docId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ["internal-doc", docId],
    queryFn: () => internalDocsApi.getDocument(docId),
    enabled: !!docId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["internal-doc", docId] })
    qc.invalidateQueries({ queryKey: ["internal-docs", "list"] })
    qc.invalidateQueries({ queryKey: ["internal-docs", "inbox-count"] })
  }

  const approve = useMutation({
    mutationFn: (comment: string) => internalDocsApi.approveDocument(docId, { comment }),
    onSuccess: () => { toast.success("Согласовано"); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка"),
  })
  const reject = useMutation({
    mutationFn: (comment: string) => internalDocsApi.rejectDocument(docId, comment),
    onSuccess: () => { toast.success("Документ отклонён"); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка"),
  })
  const revision = useMutation({
    mutationFn: (comment: string) => internalDocsApi.requestRevision(docId, comment),
    onSuccess: () => { toast.success("Отправлено на правки"); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка"),
  })
  const submit = useMutation({
    mutationFn: () => internalDocsApi.submitDocument(docId),
    onSuccess: () => { toast.success("Отправлено на согласование"); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка"),
  })
  const cancel = useMutation({
    mutationFn: () => internalDocsApi.deleteDocument(docId),
    onSuccess: () => { toast.success("Документ отменён"); navigate("/edo/my") },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка"),
  })

  const [comment, setComment] = useState("")

  if (isLoading) {
    return <div className="container mx-auto p-6 max-w-6xl"><Skeleton className="h-96" /></div>
  }
  if (isError || !doc) {
    return (
      <div className="container mx-auto p-6 max-w-6xl text-center space-y-3">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="font-medium">Документ не найден или у вас нет доступа</p>
        <Button variant="outline" asChild><Link to="/edo/my">К моим документам</Link></Button>
      </div>
    )
  }

  const isAuthor = user?.id === doc.author.id
  const activeStep = doc.steps.find((s) => s.id === doc.current_step)
  const canAct = activeStep?.approver?.id === user?.id && doc.status === "pending"
  const canCancel = isAuthor && ["draft", "pending", "revision_requested"].includes(doc.status)
    && !doc.steps.some((s) => s.status === "approved")
  const canSubmit = isAuthor && ["draft", "revision_requested"].includes(doc.status)

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/my">
          <ChevronLeft className="mr-2 h-4 w-4" />
          К моим документам
        </Link>
      </Button>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{doc.number || "Черновик"}</span>
            <span>·</span>
            <span>{doc.type.name}</span>
          </div>
          <h1 className="text-2xl font-semibold">{doc.title || "Без заголовка"}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status_display}</Badge>
            <span>Автор: {doc.author.full_name}</span>
            {doc.submitted_at && (
              <span>Отправлено {new Date(doc.submitted_at).toLocaleDateString("ru-RU")}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canSubmit && (
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Отправить
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />Отменить
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Тело документа
              </CardTitle>
            </CardHeader>
            <CardContent>
              {doc.body_rendered ? (
                <div
                  className="prose prose-sm max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: doc.body_rendered }}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Тело отрендерится после отправки на согласование.
                </p>
              )}
            </CardContent>
          </Card>

          <FieldsSummary doc={doc} />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Цепочка согласования</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc.steps.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Шаги появятся после отправки.
                </p>
              )}
              {doc.steps.map((s) => <StepRow key={s.id} step={s} />)}
            </CardContent>
          </Card>

          {canAct && activeStep && (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Ваше решение</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Комментарий (обязателен для отклонения и правок)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => approve.mutate(comment)}
                    disabled={approve.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />Согласовать
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!comment.trim()) { toast.error("Нужен комментарий"); return }
                      revision.mutate(comment)
                    }}
                    disabled={revision.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />Запросить правки
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!comment.trim()) { toast.error("Нужен комментарий"); return }
                      reject.mutate(comment)
                    }}
                    disabled={reject.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />Отклонить
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

function StepRow({ step }: { step: ApprovalStep }) {
  const Icon = STEP_ICON[step.status]
  const color =
    step.status === "approved" ? "text-green-600" :
    step.status === "rejected" ? "text-destructive" :
    step.status === "revision_requested" ? "text-amber-600" :
    step.status === "pending" ? "text-primary" :
    "text-muted-foreground"
  return (
    <div className="flex items-start gap-3">
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{step.role_label}</span>
          <Badge variant="outline" className="text-xs">{step.action_display}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {step.approver && (
            <>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {step.approver.full_name_short.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {step.approver.full_name_short}
              </span>
            </>
          )}
          {step.decided_at && (
            <span className="text-xs text-muted-foreground">
              · {new Date(step.decided_at).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>
        {step.comment && (
          <p className="text-xs text-muted-foreground mt-1 pl-0 italic line-clamp-3">
            «{step.comment}»
          </p>
        )}
      </div>
    </div>
  )
}

function FieldsSummary({ doc }: { doc: DocumentDetail }) {
  const schema = doc.type.field_schema
  const values = doc.field_values
  if (!schema.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Поля документа</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {schema.map((spec) => {
          const raw = values[spec.name]
          const display = formatFieldValue(spec.type, raw)
          if (!display) return null
          return (
            <div key={spec.name} className="grid grid-cols-[1fr_2fr] gap-3 text-sm">
              <span className="text-muted-foreground">{spec.label}</span>
              <span className="break-words">{display}</span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function formatFieldValue(type: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  if (Array.isArray(value)) return value.length ? `${value.length} эл.` : ""
  if (typeof value === "boolean") return value ? "Да" : "Нет"
  if (type === "date" && typeof value === "string")
    return new Date(value).toLocaleDateString("ru-RU")
  return String(value)
}
