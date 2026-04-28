/** Список типов документов (админка). Создание / редактирование / удаление. */
import { Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { ChevronLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  HelpPanel, HelpSection, HelpItem, HelpCallout,
} from "@/components/shared/HelpPanel"
import { ListTree, ToggleLeft, History } from "lucide-react"
import { adminApi, type AdminDocumentType } from "../api/admin"

export function AdminTypesPage() {
  const qc = useQueryClient()
  const { data: types, isLoading } = useQuery({
    queryKey: ["edo-admin", "types"],
    queryFn: adminApi.listTypes,
  })

  const remove = useMutation({
    mutationFn: (code: string) => adminApi.deleteType(code),
    onSuccess: () => {
      toast.success("Тип удалён")
      qc.invalidateQueries({ queryKey: ["edo-admin", "types"] })
    },
    onError: (e: AxiosError<{ detail?: string }>) =>
      toast.error(e.response?.data?.detail ?? "Ошибка"),
  })

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to="/edo/my">
          <ChevronLeft className="mr-2 h-4 w-4" />К моим документам
        </Link>
      </Button>

      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Типы документов</h1>
            <p className="text-muted-foreground mt-1">
              Управление каталогом служебок, заявлений, уведомлений и смет.
            </p>
          </div>
          <AdminTypesHelp />
        </div>
        <Button asChild>
          <Link to="/edo/admin/types/new">
            <Plus className="mr-2 h-4 w-4" />Создать тип
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Кто создаёт</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(types ?? []).map((t) => (
                <TypeRow
                  key={t.code} type={t}
                  onDelete={() => {
                    if (confirm(`Удалить тип «${t.name}»?`)) remove.mutate(t.code)
                  }}
                  isDeleting={remove.isPending}
                />
              ))}
              {(types ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Типов ещё нет — нажмите «Создать тип».
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function TypeRow({
  type, onDelete, isDeleting,
}: { type: AdminDocumentType; onDelete: () => void; isDeleting: boolean }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{type.code}</TableCell>
      <TableCell className="font-medium">{type.name}</TableCell>
      <TableCell>{type.category_display}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{type.initiator_resolver}</TableCell>
      <TableCell>
        <Badge variant={type.is_active ? "default" : "outline"}>
          {type.is_active ? "Активен" : "Выключен"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button asChild variant="ghost" size="icon">
          <Link to={`/edo/admin/types/${type.code}`}><Pencil className="h-4 w-4" /></Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
        </Button>
      </TableCell>
    </TableRow>
  )
}


function AdminTypesHelp() {
  return (
    <HelpPanel
      title="Типы документов (админ)"
      description="Каталог: что есть и как создать новый."
    >
      <HelpSection icon={ListTree} title="Что показывает таблица" tone="primary">
        <HelpItem label="Код">
          Slug (snake_case), используется в URL и API. После создания —{" "}
          <strong>нельзя менять</strong>.
        </HelpItem>
        <HelpItem label="Категория">
          Для группировки в пользовательском каталоге.
        </HelpItem>
        <HelpItem label="Кто создаёт">
          <code>author</code> (любой), <code>department_head</code> (только
          руководитель), <code>group:NAME</code> (член группы).
        </HelpItem>
        <HelpItem label="Статус">
          Выключенный тип не появляется в каталоге, но сохраняет историю
          старых документов.
        </HelpItem>
      </HelpSection>

      <HelpSection icon={ToggleLeft} title="Удаление" tone="red">
        <p>
          Кнопка <strong>«Корзина»</strong> удалит запись типа.
        </p>
        <HelpCallout variant="danger" title="PROTECT FK">
          Если у типа уже есть документы — удаление заблокируется. Выключите
          тип флагом <code>is_active=False</code> вместо удаления — старые
          документы при этом останутся живы и читаемы.
        </HelpCallout>
      </HelpSection>

      <HelpCallout variant="tip" title="Изменения не ретроактивны">
        После создания или правки типа изменения <strong>не повлияют</strong> на
        уже отправленные документы — у них зафиксирован{" "}
        <code>chain_snapshot</code> на момент submit. Только новые документы
        возьмут обновлённый шаблон.
      </HelpCallout>

      <HelpSection icon={History} title="История" tone="default">
        <p>
          Все изменения типов фиксируются в Django simple_history. Если нужно
          откатиться — откройте Django admin → History.
        </p>
      </HelpSection>
    </HelpPanel>
  )
}
