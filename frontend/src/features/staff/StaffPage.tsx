/**
 * Страница «Штатка» — admin-only.
 * Управление Assignment'ами всех пользователей: список с фильтрами,
 * inline-создание/редактирование/архивирование. Источник истины для
 * (компания, отдел, должность, руководитель, основное место).
 *
 * Только для группы `admin` или superuser. Бэкенд тоже это валидирует
 * через `IsAdminGroupOrReadOnly` permission.
 */
import { useMemo, useState } from "react"
import { Navigate } from "react-router"
import { toast } from "sonner"
import { Plus, Pencil, ArchiveRestore, Archive, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useAuthStore } from "@/stores/useAuthStore"
import {
  useAssignmentList,
  useCreateAssignment,
  useDeleteAssignment,
  useUpdateAssignment,
} from "@/api/hooks/useAssignments"
import { useUserList } from "@/api/hooks/useUsers"
import { orgUnitHooks } from "@/api/hooks/useOrgUnits"
import { departmentsApi } from "@/api/directoryApi"
import { useQuery } from "@tanstack/react-query"
import type { Assignment } from "@/api/types"
import type { AssignmentInput } from "@/api/usersApi"

export function StaffPage() {
  const isAdmin = useAuthStore((s) => s.hasGroup("admin"))

  // ── Filters ──
  const [userSearch, setUserSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("__all__")
  const [showArchived, setShowArchived] = useState(false)

  // ── Data ──
  const { data: assignmentsData, isLoading } = useAssignmentList({
    company: companyFilter !== "__all__" ? Number(companyFilter) : undefined,
    is_active: showArchived ? undefined : true,
    page_size: 200,
  })
  // OrgUnit с business_role=internal — кандидаты на company.
  const companiesQuery = orgUnitHooks.useList({
    business_role: "internal",
    is_active: true,
    page_size: 100,
  })
  const companies = companiesQuery.data?.results ?? []

  const filteredRows = useMemo(() => {
    const rows = assignmentsData?.results ?? []
    if (!userSearch) return rows
    const q = userSearch.toLowerCase()
    return rows.filter((a) => (a.user_full_name ?? "").toLowerCase().includes(q))
  }, [assignmentsData, userSearch])

  // ── Dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Assignment | null>(null)
  const updateMutation = useUpdateAssignment()
  const deleteMutation = useDeleteAssignment()

  // Permission gate — после всех hooks, чтобы не нарушать rules-of-hooks.
  if (!isAdmin) return <Navigate to="/403" replace />
  // Disable lint rule for the second declaration: above line is unreachable
  // for non-admins anyway, so the hooks below render only for admins.
  // Тем не менее, оставляем хуки выше для консистентности порядка вызова.

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(a: Assignment) {
    setEditing(a)
    setDialogOpen(true)
  }

  // ── Mutations declared above (before permission gate) ──

  function toggleActive(a: Assignment) {
    updateMutation.mutate(
      { id: a.id, data: { is_active: !a.is_active } },
      {
        onSuccess: () =>
          toast.success(a.is_active ? "Архивировано" : "Восстановлено"),
        onError: (e) => toast.error(`Ошибка: ${e.message}`),
      },
    )
  }

  function deleteRow(a: Assignment) {
    if (
      !confirm(
        `Удалить назначение «${a.user_full_name} — ${a.company_name}${
          a.department_name ? " / " + a.department_name : ""
        }»? Это действие необратимо.`,
      )
    ) {
      return
    }
    deleteMutation.mutate(a.id, {
      onSuccess: () => toast.success("Назначение удалено"),
      onError: (e) =>
        toast.error(
          e.message.includes("PROTECT")
            ? "Нельзя удалить — есть документы ЭДО, ссылающиеся на это назначение. Используйте «Архивировать»."
            : `Ошибка: ${e.message}`,
        ),
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Штатка</h1>
          <p className="text-sm text-muted-foreground">
            Все штатные назначения. Источник истины для модулей ЭДО, отчётов и видимости документов.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4 mr-1" /> Добавить назначение
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Поиск по имени сотрудника..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Все компании" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Все компании</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(v) => setShowArchived(v === true)}
            />
            Показать архивные
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Компания</TableHead>
                <TableHead>Подразделение</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Признаки</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Загрузка...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Назначений не найдено
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((a) => (
                <TableRow key={a.id} className={a.is_active ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{a.user_full_name}</TableCell>
                  <TableCell>{a.company_name}</TableCell>
                  <TableCell>{a.department_name ?? "—"}</TableCell>
                  <TableCell>{a.position || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {a.is_primary && <Badge variant="default">Основное</Badge>}
                      {a.is_head && <Badge variant="secondary">Руководитель</Badge>}
                      {!a.is_active && <Badge variant="outline">Архив</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(a)}
                      title={a.is_active ? "Архивировать" : "Восстановить"}
                    >
                      {a.is_active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(a)}
                      title="Удалить (если нет ссылок)"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {dialogOpen && (
        <AssignmentDialog
          open={dialogOpen}
          editing={editing}
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog — create/edit Assignment
// ─────────────────────────────────────────────────────────────────────────────

interface AssignmentDialogProps {
  open: boolean
  editing: Assignment | null
  companies: { id: number; name: string }[]
  onClose: () => void
}

function AssignmentDialog({ open, editing, companies, onClose }: AssignmentDialogProps) {
  const isEdit = editing !== null

  // ── State ──
  const [user, setUser] = useState<number | null>(editing?.user ?? null)
  const [company, setCompany] = useState<number | null>(editing?.company ?? null)
  const [department, setDepartment] = useState<number | null>(editing?.department ?? null)
  const [position, setPosition] = useState(editing?.position ?? "")
  const [isHead, setIsHead] = useState(editing?.is_head ?? false)
  const [isPrimary, setIsPrimary] = useState(editing?.is_primary ?? false)
  const [isActive, setIsActive] = useState(editing?.is_active ?? true)
  const [fromDate, setFromDate] = useState(editing?.from_date ?? "")
  const [toDate, setToDate] = useState(editing?.to_date ?? "")
  const [note, setNote] = useState(editing?.note ?? "")
  const [userSearch, setUserSearch] = useState("")

  // ── Data ──
  const usersQuery = useUserList({ search: userSearch || undefined, page_size: 50 })
  const allUsers = usersQuery.data?.results ?? []

  const departmentsQuery = useQuery({
    queryKey: ["departments", "by-company", company],
    queryFn: () =>
      company
        ? departmentsApi.list({ company, page_size: 200 })
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    enabled: company !== null,
  })
  const departments = departmentsQuery.data?.results ?? []

  // ── Mutations ──
  const createMutation = useCreateAssignment()
  const updateMutation = useUpdateAssignment()

  function handleSave() {
    if (!user) {
      toast.error("Выберите сотрудника")
      return
    }
    if (!company) {
      toast.error("Выберите компанию")
      return
    }

    const payload: AssignmentInput = {
      user,
      company,
      department,
      position: position.trim(),
      is_head: isHead,
      is_primary: isPrimary,
      is_active: isActive,
      from_date: fromDate || null,
      to_date: toDate || null,
      note: note.trim(),
    }

    const onSuccess = () => {
      toast.success(isEdit ? "Сохранено" : "Назначение создано")
      onClose()
    }
    const onError = (e: Error) => {
      toast.error(`Ошибка: ${e.message}`)
    }

    if (isEdit) {
      updateMutation.mutate({ id: editing!.id, data: payload }, { onSuccess, onError })
    } else {
      createMutation.mutate(payload, { onSuccess, onError })
    }
  }

  // Сбрасываем department при смене company.
  function handleCompanyChange(value: string) {
    const cid = Number(value)
    setCompany(cid)
    if (department && departments.find((d) => d.id === department)?.company !== cid) {
      setDepartment(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать назначение" : "Новое назначение"}</DialogTitle>
          <DialogDescription>
            Один сотрудник может занимать несколько штатных позиций. Только одно назначение
            может быть «основным».
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User selector — только при создании, при редактировании показываем имя */}
          {!isEdit ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Сотрудник</label>
              <Input
                placeholder="Поиск по имени..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <Select
                value={user ? String(user) : ""}
                onValueChange={(v) => setUser(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.full_name || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Сотрудник</label>
              <div className="text-sm py-1.5">{editing!.user_full_name}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Компания</label>
              <Select
                value={company ? String(company) : ""}
                onValueChange={handleCompanyChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите компанию" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Подразделение</label>
              <Select
                value={department ? String(department) : "__none__"}
                onValueChange={(v) => setDepartment(v === "__none__" ? null : Number(v))}
                disabled={!company}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(уровень компании)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(уровень компании)</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Должность</label>
            <Input
              placeholder="Инженер РЗА, Начальник отдела..."
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isHead} onCheckedChange={(v) => setIsHead(v === true)} />
              Руководитель
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isPrimary}
                onCheckedChange={(v) => setIsPrimary(v === true)}
              />
              Основное место
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
              />
              Активно
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Действует с</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Действует по</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Примечание</label>
            <Input
              placeholder="Любые комментарии..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {isEdit ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
