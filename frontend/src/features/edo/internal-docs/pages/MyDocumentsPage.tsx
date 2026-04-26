import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Plus, FileText, Inbox, Send, FileClock, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HelpPanel } from "@/components/shared/HelpPanel"
import { internalDocsApi } from "../api/client"
import type { DocumentListItem, DocumentStatus, ListParams } from "../api/types"

type Tab = NonNullable<ListParams["tab"]>

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
  revision_requested: "outline",
  cancelled: "outline",
}

export function MyDocumentsPage() {
  const [tab, setTab] = useState<Tab>("inbox")

  const { data: inboxCount } = useQuery({
    queryKey: ["internal-docs", "inbox-count"],
    queryFn: () => internalDocsApi.inboxCount(),
    refetchInterval: 60_000,
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Документооборот</h1>
            <p className="text-muted-foreground mt-1">
              Ваши служебки, заявления и уведомления.
            </p>
          </div>
          <MyDocumentsHelp />
        </div>
        <Button asChild size="lg">
          <Link to="/edo/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="inbox">
            <Inbox className="mr-2 h-4 w-4" />
            Ждут меня
            {inboxCount && inboxCount.count > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {inboxCount.count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outbox">
            <Send className="mr-2 h-4 w-4" />
            Мои в работе
          </TabsTrigger>
          <TabsTrigger value="drafts">
            <FileClock className="mr-2 h-4 w-4" />
            Черновики
          </TabsTrigger>
          <TabsTrigger value="archive">
            <Archive className="mr-2 h-4 w-4" />
            Архив
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox"><DocumentsList tab="inbox" /></TabsContent>
        <TabsContent value="outbox"><DocumentsList tab="outbox" /></TabsContent>
        <TabsContent value="drafts"><DocumentsList tab="drafts" /></TabsContent>
        <TabsContent value="archive"><DocumentsList tab="archive" /></TabsContent>
      </Tabs>
    </div>
  )
}

function DocumentsList({ tab }: { tab: Tab }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["internal-docs", "list", tab],
    queryFn: () => internalDocsApi.listDocuments({ tab, page_size: 50 }),
  })

  if (isLoading) return <DocumentsListSkeleton />
  if (isError) return <div className="text-destructive p-4">Ошибка загрузки списка</div>

  const rows = data?.results ?? []
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 opacity-30 mb-3" />
        <p className="font-medium">Документов нет</p>
        <p className="text-sm mt-1">
          {tab === "inbox" && "Сейчас ничего не ожидает вашего решения."}
          {tab === "outbox" && "У вас нет документов в работе."}
          {tab === "drafts" && "Черновики появятся после создания документа."}
          {tab === "archive" && "Архив пока пуст."}
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Номер</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Заголовок</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>{tab === "inbox" ? "Автор" : "Текущий шаг"}</TableHead>
            <TableHead>Обновлено</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} tab={tab} />
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function DocumentRow({ doc, tab }: { doc: DocumentListItem; tab: Tab }) {
  const navigate = useNavigate()
  const lastDate = doc.closed_at ?? doc.submitted_at ?? doc.created_at
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => navigate(`/edo/documents/${doc.id}`)}
    >
      <TableCell className="font-mono text-xs">
        {doc.number || <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-sm">{doc.type_name}</TableCell>
      <TableCell className="max-w-md truncate">{doc.title}</TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status_display}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {tab === "inbox"
          ? doc.author.full_name_short
          : doc.current_step_label || "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(lastDate).toLocaleDateString("ru-RU")}
      </TableCell>
    </TableRow>
  )
}

function MyDocumentsHelp() {
  return (
    <HelpPanel
      title="Мои документы"
      description="Ваш личный кабинет внутреннего документооборота."
    >
      <h3>Четыре вкладки</h3>
      <ul>
        <li><strong>Ждут меня</strong> — документы, по которым требуется ваше решение
          (как согласующего или подписанта). Цифра в красной плашке —
          сколько активных. Обновляется раз в минуту.</li>
        <li><strong>Мои в работе</strong> — отправленные вами документы, ещё не
          закрытые цепочкой. Включает статусы <code>pending</code> и
          <code>revision_requested</code>.</li>
        <li><strong>Черновики</strong> — заполненные, но не отправленные документы.
          Номер не присваивается до submit; черновик можно редактировать
          сколько угодно.</li>
        <li><strong>Архив</strong> — закрытые документы (согласованные, отклонённые,
          отменённые) — ваши и где вы участвовали как согласующий.</li>
      </ul>

      <h3>Создание документа</h3>
      <p>
        Кнопка <strong>Создать</strong> открывает каталог типов, сгруппированный по
        категориям (служебки, заявления, командировки, премирование,
        уведомления). Какие типы вы видите — зависит от ваших прав
        (некоторые доступны только руководителю подразделения или
        бухгалтерии).
      </p>

      <h3>Email-link согласование</h3>
      <p>
        В каждое уведомление о новом шаге зашиты прямые ссылки
        «Согласовать» / «Отклонить». Кликнуть можно даже без логина — TTL 14
        дней. Подробности — в полном гайде <code>docs/edo_user_guide.md</code> §6.
      </p>

      <h3>Подсказка</h3>
      <p>
        Если у вас включено <strong>замещение</strong> на время отпуска — все новые
        шаги, которые должны были прийти к вам, автоматически переходят
        к замещающему. Уже открытые шаги не перерезолвятся (это by design,
        для целостности аудита).
      </p>
    </HelpPanel>
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
