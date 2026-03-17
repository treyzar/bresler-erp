import { useState } from "react"
import { useParams, useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Pencil, Trash2, Upload, Download, FileText, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { registryApi } from "../api/registry"
import { LetterFormDialog } from "./LetterFormDialog"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export function LetterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: letter, isLoading } = useQuery({
    queryKey: ["letter", id],
    queryFn: () => registryApi.get(Number(id)),
    enabled: !!id,
  })

  const { data: history } = useQuery({
    queryKey: ["letter-history", id],
    queryFn: () => registryApi.history(Number(id)),
    enabled: !!id && historyOpen,
  })

  const deleteMutation = useMutation({
    mutationFn: () => registryApi.delete(Number(id)),
    onSuccess: () => {
      toast.success("Письмо удалено")
      navigate("/edo/registry")
    },
    onError: () => toast.error("Ошибка при удалении"),
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => registryApi.deleteFile(Number(id), fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letter", id] })
      toast.success("Файл удалён")
    },
    onError: () => toast.error("Ошибка при удалении файла"),
  })

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => registryApi.uploadFiles(Number(id), files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letter", id] })
      toast.success("Файлы загружены")
    },
    onError: () => toast.error("Ошибка при загрузке"),
  })

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) uploadMutation.mutate(files)
    e.target.value = ""
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Загрузка...</div>
  }
  if (!letter) return null

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/edo/registry")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-mono">{letter.number}</h1>
          <p className="text-muted-foreground">{letter.subject}</p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Редактировать
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить
        </Button>
      </div>

      <Separator />

      {/* Fields */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">Направление</p>
          <Badge variant={letter.direction === "outgoing" ? "default" : "secondary"}>
            {letter.direction_display}
          </Badge>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Дата</p>
          <p className="font-medium">{format(new Date(letter.date), "dd.MM.yyyy")}</p>
        </div>
        {letter.direction === "outgoing" ? (
          <div>
            <p className="text-muted-foreground mb-1">Получатель</p>
            <p className="font-medium">{letter.recipient || "—"}</p>
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-1">Отправитель</p>
            <p className="font-medium">{letter.sender || "—"}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground mb-1">Исполнитель</p>
          <p className="font-medium">{letter.executor.full_name || letter.executor.username}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Создал</p>
          <p className="font-medium">{letter.created_by.full_name || letter.created_by.username}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Создано</p>
          <p className="font-medium">{format(new Date(letter.created_at), "dd.MM.yyyy HH:mm")}</p>
        </div>
        {letter.note && (
          <div className="col-span-2">
            <p className="text-muted-foreground mb-1">Заметки</p>
            <p className="whitespace-pre-line">{letter.note}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Files */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Файлы ({letter.files.length})</h2>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Загрузить
              </span>
            </Button>
            <input type="file" multiple className="hidden" onChange={handleFileInput} />
          </label>
        </div>
        {letter.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет прикреплённых файлов</p>
        ) : (
          <ul className="space-y-2">
            {letter.files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{f.file_name}</span>
                <span className="text-muted-foreground">{formatBytes(f.file_size)}</span>
                <a
                  href={`/api/edo/registry/letters/${letter.id}/files/${f.id}/download/`}
                  download={f.file_name}
                >
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteFileMutation.mutate(f.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      {/* History */}
      <div>
        <button
          className="flex items-center gap-2 font-semibold text-sm"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          {historyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          История изменений
        </button>
        {historyOpen && (
          <div className="mt-3 space-y-2">
            {!history?.length ? (
              <p className="text-sm text-muted-foreground">История пуста</p>
            ) : (
              history.map((rec) => (
                <div key={rec.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <span>{format(new Date(rec.date), "dd.MM.yyyy HH:mm")}</span>
                    <span>·</span>
                    <span>{rec.user ?? "Система"}</span>
                    <Badge variant="outline" className="ml-auto">
                      {rec.type === "+" ? "Создано" : rec.type === "~" ? "Изменено" : "Удалено"}
                    </Badge>
                  </div>
                  {rec.changes.length > 0 && (
                    <ul className="space-y-1 mt-1">
                      {rec.changes.map((c, i) => (
                        <li key={i} className="text-xs">
                          <span className="font-medium">{c.field}:</span>{" "}
                          <span className="text-destructive line-through">{c.old || "—"}</span>{" "}
                          →{" "}
                          <span className="text-green-600">{c.new || "—"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <LetterFormDialog
        open={editOpen}
        letterId={letter.id}
        onClose={() => setEditOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить письмо?"
        description={`Письмо ${letter.number} будет удалено без возможности восстановления.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
