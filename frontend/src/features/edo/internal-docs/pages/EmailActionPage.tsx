/** Публичная страница email-link approve.
 *
 * Открывается по ссылке из почты `<SITE_URL>/edo/email-action/<token>/`.
 * Не требует авторизации — токен подписан SECRET_KEY.
 *
 * Шаги:
 *   1. На mount — GET бэкенду, получаем превью документа + действие (approve/reject).
 *   2. Если step уже закрыт / токен невалиден — показываем сообщение об ошибке.
 *   3. Если ОК — рендерим карточку: тип, номер, заголовок, кто согласует.
 *      Для reject — обязательное поле комментария.
 *   4. По клику кнопки — POST → бэк выполняет действие → показываем успех.
 */
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import type { AxiosError } from "axios"
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, FileText, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import api from "@/api/client"

type Action = "approve" | "reject"

interface PreviewData {
  action: Action
  document: {
    id: number
    number: string
    title: string
    author: string
  }
  step: {
    id: number
    role_label: string
    approver: string | null
  }
}

type State =
  | { phase: "loading" }
  | { phase: "ready"; data: PreviewData }
  | { phase: "error"; message: string }
  | { phase: "submitting"; data: PreviewData }
  | { phase: "done"; action: Action; documentId: number }

export function EmailActionPage() {
  const { token = "" } = useParams<{ token: string }>()
  const [state, setState] = useState<State>({ phase: "loading" })
  const [comment, setComment] = useState("")
  const [commentError, setCommentError] = useState<string | null>(null)

  // 1. Превью при mount.
  useEffect(() => {
    let cancelled = false
    api
      .get<PreviewData>(`/edo/internal/email-action/${token}/`)
      .then((r) => {
        if (!cancelled) setState({ phase: "ready", data: r.data })
      })
      .catch((e: AxiosError<{ detail?: string }>) => {
        if (cancelled) return
        const status = e.response?.status
        const detail =
          e.response?.data?.detail ??
          (status === 404 ? "Шаг согласования не найден." : "Ссылка недействительна.")
        setState({ phase: "error", message: detail })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const submit = async () => {
    if (state.phase !== "ready") return
    if (state.data.action === "reject" && !comment.trim()) {
      setCommentError("Комментарий обязателен при отклонении")
      return
    }
    setCommentError(null)
    setState({ phase: "submitting", data: state.data })
    try {
      await api.post(`/edo/internal/email-action/${token}/`, { comment: comment.trim() })
      setState({
        phase: "done",
        action: state.data.action,
        documentId: state.data.document.id,
      })
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>
      const detail = err.response?.data?.detail ?? "Ошибка выполнения действия"
      setState({ phase: "error", message: detail })
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center text-sm text-muted-foreground">Bresler ERP — ЭДО</div>
        <Inner state={state} comment={comment} setComment={setComment}
               commentError={commentError} onSubmit={submit} />
      </div>
    </div>
  )
}


function Inner({
  state, comment, setComment, commentError, onSubmit,
}: {
  state: State
  comment: string
  setComment: (v: string) => void
  commentError: string | null
  onSubmit: () => void
}) {
  if (state.phase === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Проверяем ссылку…</p>
        </CardContent>
      </Card>
    )
  }

  if (state.phase === "error") {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-lg">Действие невозможно</CardTitle>
          </div>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Возможные причины: ссылка истекла (TTL 14 дней), шаг уже закрыт
            (вами или коллегой), либо токен повреждён. Откройте систему и
            проверьте документ напрямую.
          </p>
          <Button asChild variant="outline">
            <Link to="/edo/my">Перейти в систему</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state.phase === "done") {
    const isApprove = state.action === "approve"
    return (
      <Card className={isApprove ? "border-green-500/40" : "border-destructive/40"}>
        <CardHeader>
          <div className={`flex items-center gap-2 ${isApprove ? "text-green-700" : "text-destructive"}`}>
            {isApprove ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <CardTitle className="text-lg">
              {isApprove ? "Документ согласован" : "Документ отклонён"}
            </CardTitle>
          </div>
          <CardDescription>
            {isApprove
              ? "Решение зафиксировано. Документ перешёл к следующему шагу или закрыт."
              : "Решение зафиксировано. Автор получит уведомление с вашим комментарием."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to={`/edo/documents/${state.documentId}`}>
              Открыть документ <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ready / submitting
  const data = state.data
  const isApprove = data.action === "approve"
  const isPending = state.phase === "submitting"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">
            {isApprove ? "Согласование" : "Отклонение"} документа
          </CardTitle>
        </div>
        <CardDescription>
          Подтвердите действие по ссылке из почты. Логин не требуется.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Номер</span>
            <span className="font-mono">{data.document.number || "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Заголовок</span>
            <span className="font-medium text-right">{data.document.title || "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Автор</span>
            <span className="text-right">{data.document.author || "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Ваш шаг</span>
            <span className="text-right">{data.step.role_label}</span>
          </div>
          {data.step.approver && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Согласует</span>
              <span className="text-right">{data.step.approver}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="comment" className="text-sm font-medium">
            Комментарий {!isApprove && <span className="text-destructive">*</span>}
            {isApprove && <span className="text-muted-foreground"> (опционально)</span>}
          </label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isApprove ? "Добавьте комментарий, если хотите" : "Объясните причину отклонения"
            }
            rows={3}
          />
          {commentError && <p className="text-xs text-destructive">{commentError}</p>}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button asChild variant="ghost">
            <Link to={`/edo/documents/${data.document.id}`}>Открыть в системе</Link>
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            variant={isApprove ? "default" : "destructive"}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isApprove ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {isApprove ? "Согласовать" : "Отклонить"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Действие подписано токеном из письма. Срок действия — 14 дней. После
          выполнения ссылка становится одноразовой.
        </p>
      </CardContent>
    </Card>
  )
}
