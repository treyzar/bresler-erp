/** Отчёты по EDO для админа: висящие документы, нарушения SLA, топ по типам.
 *
 *  Бэкенд: 3 endpoint'а под /admin/reports/. Все принимают `?days=N`.
 *  На отчёте «Висящие документы» — bulk-actions для админа. */
import { useState } from "react"
import { Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft, AlertTriangle, Clock, BarChart3,
  Bell, Trash2, Loader2, Download,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { HelpPanel } from "@/components/shared/HelpPanel"
import api from "@/api/client"

interface StuckDoc {
  id: number
  number: string
  title: string
  type_name: string
  author: string
  submitted_at: string | null
  days_pending: number | null
  current_step_label: string
  current_approver: string
}

interface SlaBreach {
  step_id: number
  document_id: number
  number: string
  type_name: string
  role_label: string
  approver: string
  sla_due_at: string | null
  sla_breached_at: string | null
  current_status: string
}

interface TopRow {
  type_code: string
  type_name: string
  total: number
  approved: number
  rejected: number
  pending: number
}

const fetchReport = async <T,>(path: string, days: number): Promise<{ results: T[] }> => {
  const r = await api.get(path, { params: { days } })
  return r.data
}

export function AdminReportsPage() {
  const qc = useQueryClient()
  const { data: stuck, isLoading: l1 } = useQuery({
    queryKey: ["edo-report", "stuck", 3],
    queryFn: () => fetchReport<StuckDoc>("/edo/internal/admin/reports/stuck-documents/", 3),
  })

  // Bulk-selection state живёт здесь, чтобы переживать перезагрузку секции.
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [actionMode, setActionMode] = useState<null | "remind" | "cancel">(null)
  const [comment, setComment] = useState("")

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = (rows: StuckDoc[]) => {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))
    )
  }
  const closeDialog = () => { setActionMode(null); setComment("") }

  const remind = useMutation({
    mutationFn: () => api.post("/edo/internal/admin/bulk-remind/", {
      document_ids: Array.from(selected),
      message: comment,
    }),
    onSuccess: (r: any) => {
      toast.success(`Напоминания отправлены: ${r.data.reminded.length}`)
      closeDialog()
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ["edo-report"] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка"),
  })

  const cancel = useMutation({
    mutationFn: () => api.post("/edo/internal/admin/bulk-cancel/", {
      document_ids: Array.from(selected),
      reason: comment,
    }),
    onSuccess: (r: any) => {
      toast.success(`Отменено: ${r.data.cancelled.length}; пропущено: ${r.data.skipped.length}`)
      closeDialog()
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ["edo-report"] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Ошибка"),
  })

  const { data: breaches, isLoading: l2 } = useQuery({
    queryKey: ["edo-report", "sla", 30],
    queryFn: () => fetchReport<SlaBreach>("/edo/internal/admin/reports/sla-breaches/", 30),
  })

  const { data: top, isLoading: l3 } = useQuery({
    queryKey: ["edo-report", "top", 30],
    queryFn: () => fetchReport<TopRow>("/edo/internal/admin/reports/top-by-type/", 30),
  })

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/my">
          <ChevronLeft className="mr-2 h-4 w-4" />К моим документам
        </Link>
      </Button>

      <header className="flex items-start gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Отчёты ЭДО</h1>
        <ReportsHelp />
      </header>

      <ArchiveExportCard />


      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Висящие документы (≥ 3 дней в работе)
          </CardTitle>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Выбрано: {selected.size}</span>
              <Button size="sm" variant="outline" onClick={() => setActionMode("remind")}>
                <Bell className="mr-2 h-4 w-4" />Напомнить
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setActionMode("cancel")}>
                <Trash2 className="mr-2 h-4 w-4" />Отменить
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {l1 ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={
                        (stuck?.results.length ?? 0) > 0 &&
                        selected.size === (stuck?.results.length ?? 0)
                      }
                      onCheckedChange={() => toggleAll(stuck?.results ?? [])}
                      disabled={(stuck?.results.length ?? 0) === 0}
                    />
                  </TableHead>
                  <TableHead>№</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Заголовок</TableHead>
                  <TableHead>Автор</TableHead>
                  <TableHead>На ком висит</TableHead>
                  <TableHead className="text-right">Дней</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stuck?.results ?? []).map((r) => (
                  <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggle(r.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link to={`/edo/documents/${r.id}`} className="hover:underline">{r.number}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{r.type_name}</TableCell>
                    <TableCell className="max-w-md truncate">{r.title}</TableCell>
                    <TableCell className="text-sm">{r.author}</TableCell>
                    <TableCell className="text-sm">
                      {r.current_step_label}
                      {r.current_approver && (
                        <span className="text-muted-foreground"> — {r.current_approver}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.days_pending}</TableCell>
                  </TableRow>
                ))}
                {(stuck?.results ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Зависших документов нет.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Диалог bulk-действия */}
      <Dialog open={actionMode !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionMode === "remind" ? "Напомнить согласующим" : "Принудительно отменить документы"}
            </DialogTitle>
            <DialogDescription>
              {actionMode === "remind"
                ? `Будет отправлено уведомление по ${selected.size} документ(ам) активным согласующим.`
                : `${selected.size} документ(ов) будут принудительно отменены. Действие необратимо.`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              actionMode === "remind"
                ? "Сообщение (опционально)"
                : "Причина отмены (обязательна)"
            }
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>Отмена</Button>
            <Button
              variant={actionMode === "cancel" ? "destructive" : "default"}
              onClick={() => {
                if (actionMode === "remind") remind.mutate()
                else if (actionMode === "cancel") {
                  if (!comment.trim()) { toast.error("Укажите причину"); return }
                  cancel.mutate()
                }
              }}
              disabled={remind.isPending || cancel.isPending}
            >
              {(remind.isPending || cancel.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionMode === "remind" ? "Отправить напоминание" : "Отменить документы"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Нарушения SLA за 30 дней
          </CardTitle>
        </CardHeader>
        <CardContent>
          {l2 ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Документ</TableHead>
                  <TableHead>Шаг</TableHead>
                  <TableHead>Согласующий</TableHead>
                  <TableHead>SLA до</TableHead>
                  <TableHead>Зафиксировано</TableHead>
                  <TableHead>Статус шага</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(breaches?.results ?? []).map((r) => (
                  <TableRow key={r.step_id}>
                    <TableCell className="font-mono text-xs">
                      <Link to={`/edo/documents/${r.document_id}`} className="hover:underline">{r.number}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{r.role_label}</TableCell>
                    <TableCell className="text-sm">{r.approver}</TableCell>
                    <TableCell className="text-sm">
                      {r.sla_due_at ? new Date(r.sla_due_at).toLocaleString("ru-RU") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.sla_breached_at ? new Date(r.sla_breached_at).toLocaleString("ru-RU") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.current_status}</TableCell>
                  </TableRow>
                ))}
                {(breaches?.results ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Просрочек SLA не зафиксировано.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Топ типов за 30 дней
          </CardTitle>
        </CardHeader>
        <CardContent>
          {l3 ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Всего</TableHead>
                  <TableHead className="text-right">Согласовано</TableHead>
                  <TableHead className="text-right">Отклонено</TableHead>
                  <TableHead className="text-right">В работе</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(top?.results ?? []).map((r) => (
                  <TableRow key={r.type_code}>
                    <TableCell>{r.type_name}</TableCell>
                    <TableCell className="text-right font-mono">{r.total}</TableCell>
                    <TableCell className="text-right text-green-700 font-mono">{r.approved}</TableCell>
                    <TableCell className="text-right text-destructive font-mono">{r.rejected}</TableCell>
                    <TableCell className="text-right font-mono">{r.pending}</TableCell>
                  </TableRow>
                ))}
                {(top?.results ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Документов за 30 дней нет.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


/** Карточка ZIP-экспорта архива за период. Запросом возвращается binary stream. */
function ArchiveExportCard() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)

  const download = async () => {
    if (!from || !to) {
      toast.error("Укажите диапазон дат")
      return
    }
    setBusy(true)
    try {
      const r = await api.get("/edo/internal/admin/export-archive-zip/", {
        params: { from, to },
        responseType: "blob",
      })
      const summary = r.headers["x-archive-summary"] || ""
      const url = URL.createObjectURL(r.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `edo_archive_${from}_${to}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Архив скачан${summary ? ` (${summary})` : ""}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Ошибка экспорта")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-4 w-4" />
          Экспорт архива (ZIP)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Архив документов с PDF-рендером, метаданными и вложениями. Выберите
          период по дате отправки или закрытия документа.
        </p>
        <div className="flex items-end gap-3">
          <div>
            <Label htmlFor="archive-from">С</Label>
            <Input
              id="archive-from" type="date"
              value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-44"
            />
          </div>
          <div>
            <Label htmlFor="archive-to">По</Label>
            <Input
              id="archive-to" type="date"
              value={to} onChange={(e) => setTo(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={download} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Скачать ZIP
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


function ReportsHelp() {
  return (
    <HelpPanel
      title="Отчёты и операции админа"
      description="ZIP-архив, висящие документы, SLA, топ типов, bulk-операции."
    >
      <h3>Экспорт архива (ZIP)</h3>
      <p>
        Скачивание ZIP с PDF-копиями, метаданными и вложениями документов
        за период. Документ попадает в архив, если его <code>submitted_at</code> или{" "}
        <code>closed_at</code> внутри диапазона. В корне архива — <code>index.json</code>{" "}
        со сводкой; по каждому документу — папка с <code>metadata.json</code>,{" "}
        <code>document.pdf</code> и <code>attachments/</code>.
      </p>
      <p>
        В response-заголовке <code>X-Archive-Summary</code> — счётчики (всего,
        успешные/неудачные PDF, число вложений). Если PDF не сгенерится для
        какого-то документа — он всё равно попадает в архив (только без
        PDF), архив не падает целиком.
      </p>

      <h3>Висящие документы</h3>
      <p>
        Документы в <code>PENDING</code> дольше 3 дней. По строкам — чекбоксы:
      </p>
      <ul>
        <li><strong>Напомнить</strong> — отправить bell-уведомление текущим активным
          согласующим (для параллельных веток — всем участникам). Сообщение
          опционально (по умолчанию — стандартный текст).</li>
        <li><strong>Отменить</strong> — принудительно перевести документы в{" "}
          <code>cancelled</code>. <strong>Причина обязательна</strong>, попадёт в комментарий
          шага для аудита. Override обычного <code>cancel</code>: работает даже после
          первого approve. Закрытые документы (approved/rejected/cancelled)
          пропускаются.</li>
      </ul>

      <h3>Нарушения SLA</h3>
      <p>
        Шаги, у которых <code>sla_breached_at</code> зафиксирован Celery-задачей
        (запускается раз в час). Каждый шаг помечается один раз — повторных
        уведомлений не будет.
      </p>
      <p>
        Эскалация: уведомления уходят автору, согласующему{" "}
        <strong>и его непосредственному руководителю</strong> через{" "}
        <code>resolve_supervisor()</code>.
      </p>

      <h3>Топ типов</h3>
      <p>
        За 30 дней по числу созданных документов. Колонки — total / approved /
        rejected / pending. Это понимание нагрузки и того, какие типы реально
        используются.
      </p>

      <h3>Параметризация</h3>
      <p>
        Все три отчёта принимают <code>?days=N</code> в URL. Задизайнить
        custom-период через UI пока нельзя, но можно открыть API напрямую:
      </p>
      <ul>
        <li><code>GET /api/edo/internal/admin/reports/stuck-documents/?days=7</code></li>
        <li><code>GET /api/edo/internal/admin/reports/sla-breaches/?days=90</code></li>
        <li><code>GET /api/edo/internal/admin/reports/top-by-type/?days=30&limit=10</code></li>
      </ul>
    </HelpPanel>
  )
}
