import { useState } from "react"
import { useNavigate } from "react-router"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, Search, X, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { OrgUnitCombobox } from "@/components/shared/OrgUnitCombobox"
import type { ListParams, OrderListItem } from "@/api/types"
import { ORDER_STATUSES } from "@/api/types"
import { useOrderList, useDeleteOrder, useOrderFuzzySearch } from "@/api/hooks/useOrders"
import { useDebounce } from "@/hooks/useDebounce"

const PAGE_SIZE = 20

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  N: "outline",
  P: "default",
  C: "secondary",
  T: "outline",
  A: "secondary",
}

export function OrdersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [customerFilter, setCustomerFilter] = useState<number | null>(null)
  const [shipDateFrom, setShipDateFrom] = useState("")
  const [shipDateTo, setShipDateTo] = useState("")
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [deleteItem, setDeleteItem] = useState<OrderListItem | null>(null)

  const listParams: ListParams = { page, page_size: PAGE_SIZE }
  if (debouncedSearch) listParams.search = debouncedSearch
  if (statusFilter && statusFilter !== "all") listParams.status = statusFilter
  if (customerFilter) listParams.customer = customerFilter
  if (shipDateFrom) listParams.ship_date_from = shipDateFrom
  if (shipDateTo) listParams.ship_date_to = shipDateTo

  const { data, isLoading } = useOrderList(listParams)
  const { data: suggestions } = useOrderFuzzySearch(data?.count === 0 && debouncedSearch ? debouncedSearch : "")
  const deleteMutation = useDeleteOrder()

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await deleteMutation.mutateAsync(deleteItem.order_number)
      toast.success("Заказ удалён")
      setDeleteItem(null)
    } catch {
      toast.error("Ошибка при удалении")
    }
  }

  const handleSuggestionClick = (tender: string) => {
    setSearch(tender)
    setPage(1)
  }

  const columns: ColumnDef<OrderListItem, unknown>[] = [
    {
      accessorKey: "order_number",
      header: "№",
      size: 70,
      cell: ({ row }) => <span className="font-bold">{row.original.order_number}</span>,
    },
    {
      accessorKey: "country_name",
      header: "Страна",
      size: 100,
    },
    {
      accessorKey: "customer_name",
      header: "Заказчик",
      size: 180,
    },
    {
      accessorKey: "branch_name",
      header: "Филиал",
      size: 180,
    },
    {
      accessorKey: "division_name",
      header: "Пр. отделение",
      size: 180,
    },
    {
      accessorKey: "facility_names",
      header: "Объект",
      size: 180,
      cell: ({ row }) => (
        <span className="line-clamp-1" title={row.original.facility_names}>
          {row.original.facility_names}
        </span>
      ),
    },
    {
      accessorKey: "equipment_names",
      header: "Оборудование",
      size: 180,
      cell: ({ row }) => (
        <span className="line-clamp-1 text-xs" title={row.original.equipment_names}>
          {row.original.equipment_names}
        </span>
      ),
    },
    {
      accessorKey: "work_names",
      header: "Работы",
      size: 150,
      cell: ({ row }) => (
        <span className="line-clamp-1 text-xs" title={row.original.work_names}>
          {row.original.work_names}
        </span>
      ),
    },
    {
      accessorKey: "tender_number",
      header: "№ тендера",
      size: 120,
    },
    {
      accessorKey: "participant_names",
      header: "Участник запроса",
      size: 180,
      cell: ({ row }) => (
        <span className="line-clamp-1" title={row.original.participant_names}>
          {row.original.participant_names}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Статус заказа",
      size: 130,
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status] ?? "outline"} className="whitespace-nowrap">
          {row.original.status_display}
        </Badge>
      ),
    },
    {
      accessorKey: "ship_date",
      header: "Дата отгрузки",
      size: 120,
      cell: ({ row }) => row.original.ship_date ? new Date(row.original.ship_date).toLocaleDateString("ru") : "—",
    },
    {
      id: "actions",
      header: "",
      size: 80,
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/orders/${row.original.order_number}/edit`)
            }}
            title="Редактировать"
          >
            <Pencil className="size-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteItem(row.original)
            }}
            title="Удалить"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Заказы</h1>
        <Button size="sm" onClick={() => navigate("/orders/new")}>
          <Plus className="size-4 mr-1" />
          Создать заказ
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-muted/20 p-4 rounded-xl border">
        <div className="relative w-[300px]">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block pl-1">Поиск</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Номер, тендер, примечание..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 pr-9 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block pl-1">Статус</Label>
          <Select
            value={statusFilter}
            onValueChange={(val) => { setStatusFilter(val); setPage(1) }}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(ORDER_STATUSES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[240px]">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block pl-1">Заказчик</Label>
          <OrgUnitCombobox
            mode="single"
            value={customerFilter}
            onChange={(val) => { setCustomerFilter(val); setPage(1) }}
          />
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block pl-1">Отгрузка от</Label>
            <Input
              type="date"
              className="w-[140px] h-9"
              value={shipDateFrom}
              onChange={(e) => { setShipDateFrom(e.target.value); setPage(1) }}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block pl-1">до</Label>
            <Input
              type="date"
              className="w-[140px] h-9"
              value={shipDateTo}
              onChange={(e) => { setShipDateTo(e.target.value); setPage(1) }}
            />
          </div>
        </div>
      </div>

      {data?.count === 0 && debouncedSearch && suggestions && suggestions.length > 0 && (
        <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Ничего не найдено по запросу «{debouncedSearch}»</p>
            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
              <span>Возможно, вы имели в виду:</span>
              {suggestions.map((s, i) => (
                <button
                  key={`${s.order_number}-${i}`}
                  onClick={() => handleSuggestionClick(s.text)}
                  className="text-primary hover:underline font-medium bg-primary/10 px-2 py-0.5 rounded"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        totalCount={data?.count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => { setPage(p); setSelectedRows({}) }}
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        enableSelection={false}
        enableSearch={false}
        onRowClick={(row) => navigate(`/orders/${row.order_number}`)}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null) }}
        title="Удалить заказ?"
        description={`Заказ #${deleteItem?.order_number} будет удалён безвозвратно.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
