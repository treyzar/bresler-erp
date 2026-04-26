import { useRef, useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft, CheckCircle, XCircle, RotateCcw, FileText,
  Clock, CheckCheck, AlertCircle, Loader2, Trash2, Send, Download,
  Paperclip, Upload, UserPlus, Pencil, Save, X,
} from "lucide-react"
import { toast } from "sonner"
import api from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Timeline } from "@/components/shared/Timeline"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { SignaturePad } from "@/components/shared/SignaturePad"
import { LinkedDocuments } from "@/components/shared/LinkedDocuments"
import {
  HelpPanel, HelpSection, HelpItem, HelpCallout,
} from "@/components/shared/HelpPanel"
import {
  LayoutDashboard, MousePointerClick, PenLine, FilePenLine,
  Link2 as Link2Icon, FileDown,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useAuthStore } from "@/stores/useAuthStore"
import { DynamicField } from "../components/DynamicField"
import { internalDocsApi } from "../api/client"
import type { ApprovalStep, DocumentAttachment, DocumentDetail, DocumentStatus, FieldSpec } from "../api/types"

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

  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ["internal-doc", docId],
    queryFn: () => internalDocsApi.getDocument(docId),
    enabled: !!docId && !!accessToken,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    // Не зацикливаем 401/403/404 — это не транзиентные ошибки, ретрай только усугубит.
    retry: (failureCount, error: any) => {
      const status = error?.response?.status
      if (status === 401 || status === 403 || status === 404) return false
      return failureCount < 2
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["internal-doc", docId] })
    qc.invalidateQueries({ queryKey: ["internal-docs", "list"] })
    qc.invalidateQueries({ queryKey: ["internal-docs", "inbox-count"] })
  }

  const approve = useMutation({
    mutationFn: (payload: { comment: string; signature_image?: string }) =>
      internalDocsApi.approveDocument(docId, payload),
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
  const [signatureImage, setSignatureImage] = useState<string | null>(null)

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
  const canEdit = isAuthor && ["draft", "revision_requested"].includes(doc.status)
  const activeStep = doc.steps.find((s) => s.id === doc.current_step)
  const canAct = doc.status === "pending" && _userCanActOnStep(activeStep, user)
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
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {doc.title || "Без заголовка"}
            <DocumentDetailHelp canAct={canAct} isAuthor={isAuthor} />
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status_display}</Badge>
            <span>Автор: {doc.author.full_name}</span>
            {doc.submitted_at && (
              <span>Отправлено {new Date(doc.submitted_at).toLocaleDateString("ru-RU")}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {doc.body_rendered && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const blob = await internalDocsApi.downloadPdf(docId)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `${doc.number || "document"}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                } catch (e: any) {
                  toast.error(e?.response?.data?.detail ?? "Ошибка генерации PDF")
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />PDF
            </Button>
          )}
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

          <FieldsSummary doc={doc} canEdit={canEdit} onSaved={invalidate} />

          <AttachmentsCard doc={doc} canUpload={isAuthor || canAct} onChanged={invalidate} />

          <LinkedDocuments
            sourceModel="document"
            sourceId={doc.id}
            canEdit={isAuthor || canAct}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Комментарии и история</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline targetModel="document" targetId={doc.id} />
            </CardContent>
          </Card>
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
                {doc.type.requires_drawn_signature && (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Подпись</p>
                    <SignaturePad onChange={setSignatureImage} width={400} height={140} />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      if (doc.type.requires_drawn_signature && !signatureImage) {
                        toast.error("Документ требует подпись — поставьте её на холсте")
                        return
                      }
                      approve.mutate({
                        comment,
                        signature_image: signatureImage ?? undefined,
                      })
                    }}
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
                  <DelegateButton docId={docId} onDelegated={invalidate} />
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

  // Для коллективного шага (role_key=group:NAME[@company]) показываем
  // «Любой сотрудник группы», пока кто-то реально не принял решение —
  // pre-resolved approver вводит в заблуждение.
  const isGroupStep = (step.role_key || "").startsWith("group:")
  const showResolvedUser = !isGroupStep || step.status !== "pending"

  return (
    <div className="flex items-start gap-3">
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{step.role_label}</span>
          <Badge variant="outline" className="text-xs">{step.action_display}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {showResolvedUser && step.approver && (
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
          {!showResolvedUser && (
            <span className="text-xs text-muted-foreground italic">
              Любой сотрудник группы
            </span>
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

function FieldsSummary({
  doc, canEdit, onSaved,
}: { doc: DocumentDetail; canEdit: boolean; onSaved: () => void }) {
  const schema: FieldSpec[] = doc.type.field_schema ?? []
  const display = doc.field_values_display ?? {}
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const startEdit = () => {
    setValues({ ...(doc.field_values ?? {}) })
    setErrors({})
    setIsEditing(true)
  }

  const save = useMutation({
    mutationFn: () => internalDocsApi.updateDocument(doc.id, { field_values: values }),
    onSuccess: () => {
      toast.success("Изменения сохранены")
      setIsEditing(false)
      onSaved()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка сохранения"),
  })

  const handleSave = () => {
    const next: Record<string, string> = {}
    for (const spec of schema) {
      if (spec.required) {
        const v = values[spec.name]
        const empty = v === undefined || v === null || v === "" ||
          (Array.isArray(v) && v.length === 0)
        if (empty) next[spec.name] = "Обязательное поле"
      }
    }
    setErrors(next)
    if (Object.keys(next).length) {
      toast.error("Заполните обязательные поля")
      return
    }
    save.mutate()
  }

  if (!schema.length) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Поля документа</CardTitle>
          {doc.status === "revision_requested" && canEdit && !isEditing && (
            <p className="text-sm text-amber-600 mt-1">
              Запрошены правки — внесите изменения и отправьте документ повторно.
            </p>
          )}
        </div>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Внести правки
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={save.isPending}>
              <X className="mr-2 h-4 w-4" />Отмена
            </Button>
            <Button size="sm" onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          schema.map((spec) => (
            <DynamicField
              key={spec.name}
              spec={spec}
              value={values[spec.name]}
              onChange={(v) => setValues((prev) => ({ ...prev, [spec.name]: v }))}
              error={errors[spec.name]}
            />
          ))
        ) : (
          schema.map((spec) => {
            const value = display[spec.name]
            if (!value) return null
            return (
              <div key={spec.name} className="grid grid-cols-[1fr_2fr] gap-3 text-sm">
                <span className="text-muted-foreground">{spec.label}</span>
                <span className="break-words whitespace-pre-line">{value}</span>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}


function AttachmentsCard({
  doc, canUpload, onChanged,
}: { doc: DocumentDetail; canUpload: boolean; onChanged: () => void }) {
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      await internalDocsApi.uploadAttachment(doc.id, f)
      toast.success("Файл загружен")
      onChanged()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Ошибка загрузки")
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4" />
          Вложения ({doc.attachments.length})
        </CardTitle>
        {canUpload && (
          <>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={onFileChosen}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Загрузить
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent>
        {doc.attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет прикреплённых файлов.</p>
        ) : (
          <ul className="space-y-2">
            {doc.attachments.map((a) => (
              <AttachmentRow key={a.id} att={a} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}


function AttachmentRow({ att }: { att: DocumentAttachment }) {
  const sizeKb = Math.max(1, Math.round(att.file_size / 1024))
  return (
    <li className="flex items-center justify-between gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <a
            href={att.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline truncate block"
          >
            {att.file_name}
          </a>
          <div className="text-xs text-muted-foreground">
            {sizeKb} Кб · {att.uploaded_by.full_name_short} · {new Date(att.uploaded_at).toLocaleDateString("ru-RU")}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" asChild>
        <a href={att.file_url} download>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </li>
  )
}


interface UserOption { id: number; name: string; position: string }

function DelegateButton({
  docId, onDelegated,
}: { docId: number; onDelegated: () => void }) {
  const [open, setOpen] = useState(false)
  const [toUserId, setToUserId] = useState<number | null>(null)
  const [options, setOptions] = useState<UserOption[]>([])

  useEffect(() => {
    if (!open) return
    // Делегируем коллегам по своей компании — за пределы юрлица обычно
    // делегировать не имеет смысла, и список из 400+ человек неудобен.
    api.get("/users/", { params: { page_size: 500, in_my_company: true } }).then((r) => {
      const raw = r.data?.results ?? r.data ?? []
      setOptions(raw.map((u: any) => ({
        id: u.id,
        name: [u.last_name, u.first_name, u.patronymic].filter(Boolean).join(" ") || u.username,
        position: u.position ?? "",
      })))
    })
  }, [open])

  const delegate = useMutation({
    mutationFn: (to: number) => internalDocsApi.delegateDocument(docId, to),
    onSuccess: () => {
      toast.success("Шаг делегирован")
      setOpen(false)
      setToUserId(null)
      onDelegated()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка"),
  })

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />Делегировать
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Делегировать шаг согласования</DialogTitle>
            <DialogDescription>
              Выберите сотрудника, которому передаёте текущий шаг. После делегирования
              решение по шагу сможет принять только выбранный сотрудник.
            </DialogDescription>
          </DialogHeader>
          <SearchableSelect
            options={options.map((u) => ({
              value: String(u.id),
              label: u.position ? `${u.name} — ${u.position}` : u.name,
            }))}
            value={toUserId ? String(toUserId) : ""}
            onChange={(v) => setToUserId(v ? Number(v) : null)}
            placeholder="Выберите сотрудника..."
            searchPlaceholder="Поиск..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button
              onClick={() => toUserId && delegate.mutate(toUserId)}
              disabled={!toUserId || delegate.isPending}
            >
              {delegate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Делегировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


/** Может ли user принять решение по шагу: либо он лично approver, либо
 * шаг коллективный (role_key=group:NAME[@company]) и он в этой группе.
 * Backend всё равно проверит на approve — здесь оптимистично включаем UI.
 */
function _userCanActOnStep(
  step: ApprovalStep | undefined,
  user: { id: number; groups?: string[] } | null | undefined,
): boolean {
  if (!step || !user) return false
  if (step.approver?.id === user.id) return true
  const rk = step.role_key || ""
  if (!rk.startsWith("group:")) return false
  const groupName = rk.slice("group:".length).split("@")[0]
  return (user.groups ?? []).includes(groupName)
}


function DocumentDetailHelp({ canAct, isAuthor }: { canAct: boolean; isAuthor: boolean }) {
  return (
    <HelpPanel
      title="Страница документа"
      description="Что здесь можно делать."
    >
      <HelpSection icon={LayoutDashboard} title="Что вы видите" tone="primary">
        <HelpItem label="Слева">
          Тело документа (отрендеренное), таблица полей, вложения, связанные
          документы, таймлайн истории.
        </HelpItem>
        <HelpItem label="Справа">
          Цепочка согласования. Каждый шаг — иконка статуса (часы = ждёт,
          галочка = одобрен, крест = отклонён) + аватар согласующего.
        </HelpItem>
      </HelpSection>

      {canAct && (
        <>
          <HelpSection icon={MousePointerClick} title="Ваш шаг — что нажимать" tone="primary">
            <HelpItem label="Согласовать">
              Комментарий опционален, переход к следующему шагу автоматический.
            </HelpItem>
            <HelpItem label="Запросить правки">
              Комментарий обязателен. Документ вернётся автору в{" "}
              <code>revision_requested</code>, тот поправит и отправит заново.
            </HelpItem>
            <HelpItem label="Отклонить">
              Финальный статус. Комментарий обязателен. Повторного согласования
              не будет — автор должен создать новый документ.
            </HelpItem>
            <HelpItem label="Делегировать">
              Передать решение другому. Ваше имя сохранится в{" "}
              <code>original_approver</code> для аудита.
            </HelpItem>
          </HelpSection>

          <HelpSection icon={PenLine} title="Рисованная подпись" tone="amber">
            <p>
              Если у документа стоит флаг{" "}
              <code>requires_drawn_signature</code> (командировки, уведомления
              об отпуске) — над кнопками появится холст. Подпишите мышью или
              пальцем; PDF получит подпись в подвале.
            </p>
          </HelpSection>
        </>
      )}

      {isAuthor && (
        <HelpSection icon={FilePenLine} title="Что доступно автору" tone="default">
          <HelpItem label="Редактирование">
            Если документ в <code>draft</code> или <code>revision_requested</code> —
            можно править поля (кнопка «Внести правки» в карточке полей).
          </HelpItem>
          <HelpItem label="Отмена">
            Кнопка <strong>«Отменить»</strong> в шапке доступна, пока ни один
            шаг не одобрен. После первого approve — только запрос правок.
          </HelpItem>
          <HelpItem label="Вложения">
            Можно прикладывать файлы в любое время (карточка «Вложения»).
          </HelpItem>
        </HelpSection>
      )}

      <HelpSection icon={Link2Icon} title="Связанные документы" tone="default">
        <p>
          Кнопкой <strong>«Связать»</strong> можно прикрепить другой документ
          ЭДО (введите ≥2 символов от номера или заголовка). Связи отображаются
          с двух сторон.
        </p>
      </HelpSection>

      <HelpSection icon={FileDown} title="PDF и архив" tone="default">
        <p>
          Кнопка <strong>«PDF»</strong> в шапке возвращает PDF с шапкой компании,
          директором (из справочника «Шапки организаций») и подписями. Кеш —
          7 дней, регенерируется при любом изменении.
        </p>
      </HelpSection>

      <HelpCallout variant="tip" title="Email-link approve">
        Если вам пришло письмо о новом шаге — там вшиты ссылки прямого
        approve/reject. Кликнуть из почты можно без логина (TTL 14 дней).
        Если шаг закрыт раньше — ссылка вернёт «Шаг уже закрыт».
      </HelpCallout>
    </HelpPanel>
  )
}
