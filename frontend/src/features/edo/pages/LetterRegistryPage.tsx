import { useState } from "react"
import { useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Search, Eye, Pencil, Trash2, Lock } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useDebounce } from "@/hooks/useDebounce"
import {
  registryApi,
  LETTER_ORDERING_OPTIONS,
  type LetterListItem,
  type LetterListParams,
} from "../api/registry"
import { LetterFormDialog } from "./LetterFormDialog"

const PAGE_SIZE = 20

const directionBadge = (dir: string) =>
  dir === "outgoing" ? (
    <Badge variant="default">Исходящее</Badge>
  ) : (
    <Badge variant="secondary">Входящее</Badge>
  )

export function LetterRegistryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [direction, setDirection] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [ordering, setOrdering] = useState("-seq")

  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteItem, setDeleteItem] = useState<LetterListItem | null>(null)

  const params: LetterListParams = { page, page_size: PAGE_SIZE, ordering }
  if (debouncedSearch) params.search = debouncedSearch
  if (direction && direction !== "all") params.direction = direction as "outgoing" | "incoming"
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo

  const { data, isLoading } = useQuery({
    queryKey: ["letters", params],
    queryFn: () => registryApi.list(params),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => registryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letters"] })
      toast.success("Письмо удалено")
      setDeleteItem(null)
    },
    onError: () => toast.error("Ошибка при удалении"),
  })

  const columns: ColumnDef<LetterListItem>[] = [
    {
      accessorKey: "number",
      header: "№",
      size: 100,
      cell: ({ row }) => <span className="font-mono font-semibold">{row.original.number}</span>,
    },
    {
      accessorKey: "date",
      header: "Дата",
      size: 100,
      cell: ({ row }) => format(new Date(row.original.date), "dd.MM.yyyy"),
    },
    {
      accessorKey: "direction",
      header: "Направление",
      size: 120,
      cell: ({ row }) => directionBadge(row.original.direction),
    },
    {
      id: "counterparty",
      header: "Контрагент",
      cell: ({ row }) => {
        const { direction, recipient, sender, is_hidden } = row.original
        if (is_hidden) {
          return (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" /> скрыто
            </span>
          )
        }
        return direction === "outgoing" ? recipient : sender
      },
    },
    {
      accessorKey: "subject",
      header: "Тема",
      cell: ({ row }) =>
        row.original.is_hidden ? (
          <span className="text-muted-foreground italic">— скрыто —</span>
        ) : (
          <span className="max-w-xs truncate">{row.original.subject}</span>
        ),
    },
    {
      accessorKey: "executor_name",
      header: "Исполнитель",
      size: 150,
    },
    {
      accessorKey: "files_count",
      header: "Файлы",
      size: 70,
      cell: ({ row }) => row.original.files_count || "—",
    },
    {
      id: "actions",
      header: "",
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/edo/registry/${row.original.id}`)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setEditId(row.original.id)
              setFormOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteItem(row.original)
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Реестр писем</h1>
        <Button onClick={() => { setEditId(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Создать письмо
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-56">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру, теме..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={direction} onValueChange={(v) => { setDirection(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Направление" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="outgoing">Исходящие</SelectItem>
            <SelectItem value="incoming">Входящие</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">с</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">по</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="w-36"
          />
        </div>
        <Select value={ordering} onValueChange={(v) => { setOrdering(v); setPage(1) }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            {LETTER_ORDERING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        isLoading={isLoading}
        totalCount={data?.count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        enableSearch={false}
        enableSelection={false}
        onRowClick={(row) => navigate(`/edo/registry/${row.id}`)}
      />

      <LetterFormDialog
        open={formOpen}
        letterId={editId}
        onClose={() => { setFormOpen(false); setEditId(null) }}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(v) => !v && setDeleteItem(null)}
        title="Удалить письмо?"
        description={`Письмо ${deleteItem?.number} будет удалено без возможности восстановления.`}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
