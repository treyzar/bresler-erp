import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Plus, FileText, Inbox, Send, FileClock, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { internalDocsApi } from "../api/client"
import type { DocumentListItem, DocumentStatus, ListParams } from "../api/types"

type Tab = NonNullable<ListParams["tab"]>

interface PageMeta {
  title: string
  subtitle: string
  icon: React.ElementType
  emptyText: string
  primaryColumn: "author" | "current" | "closed"
}

const PAGES: Record<Tab, PageMeta> = {
  inbox: {
    title: "Входящие на согласование",
    subtitle: "Документы, требующие вашего решения. Сюда попадают как персональные шаги, так и шаги, адресованные вашей группе (например, бухгалтерия).",
    icon: Inbox,
    emptyText: "Сейчас ничего не ожидает вашего решения.",
    primaryColumn: "author",
  },
  outbox: {
    title: "Мои отправленные",
    subtitle: "Документы, которые вы создали и отправили на согласование. Видно текущий шаг и кто его рассматривает.",
    icon: Send,
    emptyText: "У вас нет документов в работе.",
    primaryColumn: "current",
  },
  drafts: {
    title: "Черновики",
    subtitle: "Незавершённые документы. Можно редактировать и отправлять на согласование.",
    icon: FileClock,
    emptyText: "Черновики появятся, когда вы начнёте создавать документ и не отправите его сразу.",
    primaryColumn: "current",
  },
  archive: {
    title: "Архив",
    subtitle: "Завершённые документы (согласованные, отклонённые, отменённые) — ваши и те, где вы участвовали в цепочке согласования.",
    icon: Archive,
    emptyText: "Архив пока пуст.",
    primaryColumn: "closed",
  },
}

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
  revision_requested: "outline",
  cancelled: "outline",
}

export function DocumentListPage({ tab }: { tab: Tab }) {
  const meta = PAGES[tab]
  const Icon = meta.icon

  const { data: inboxCount } = useQuery({
    queryKey: ["internal-docs", "inbox-count"],
    queryFn: () => internalDocsApi.inboxCount(),
    refetchInterval: 60_000,
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 mt-1">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              {meta.title}
              {tab === "inbox" && inboxCount && inboxCount.count > 0 && (
                <Badge variant="destructive">{inboxCount.count}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
              {meta.subtitle}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/edo/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Link>
        </Button>
      </div>

      <DocumentsList tab={tab} meta={meta} />
    </div>
  )
}

function DocumentsList({ tab, meta }: { tab: Tab; meta: PageMeta }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["internal-docs", "list", tab],
    queryFn: () => internalDocsApi.listDocuments({ tab, page_size: 50 }),
    refetchInterval: 30_000,
  })

  if (isLoading) return <DocumentsListSkeleton />
  if (isError) return <div className="text-destructive p-4">Ошибка загрузки списка</div>

  const rows = data?.results ?? []
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 opacity-30 mb-3" />
        <p className="font-medium">Документов нет</p>
        <p className="text-sm mt-1">{meta.emptyText}</p>
      </Card>
    )
  }

  const colHeader =
    meta.primaryColumn === "author" ? "Автор" :
    meta.primaryColumn === "current" ? "Текущий шаг" :
    "Завершено"

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Номер</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Заголовок</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>{colHeader}</TableHead>
            <TableHead>Обновлено</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} primary={meta.primaryColumn} />
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function DocumentRow({ doc, primary }: {
  doc: DocumentListItem
  primary: "author" | "current" | "closed"
}) {
  const lastDate = doc.closed_at ?? doc.submitted_at ?? doc.created_at
  const primaryCell =
    primary === "author" ? doc.author.full_name_short :
    primary === "current" ? (doc.current_step_label || "—") :
    (doc.closed_at ? new Date(doc.closed_at).toLocaleDateString("ru-RU") : "—")
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" asChild>
      <Link to={`/edo/documents/${doc.id}`} className="contents">
        <TableCell className="font-mono text-xs">
          {doc.number || <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="text-sm">{doc.type_name}</TableCell>
        <TableCell className="max-w-md truncate">{doc.title}</TableCell>
        <TableCell>
          <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status_display}</Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{primaryCell}</TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {new Date(lastDate).toLocaleDateString("ru-RU")}
        </TableCell>
      </Link>
    </TableRow>
  )
}

function DocumentsListSkeleton() {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Номер</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Заголовок</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>—</TableHead>
            <TableHead>Обновлено</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
