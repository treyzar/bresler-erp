import { useState } from "react"
import { useNavigate } from "react-router"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { Plus } from "lucide-react"
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
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { ListParams, OrderListItem } from "@/api/types"
import { ORDER_STATUSES } from "@/api/types"
import { useOrderList, useDeleteOrder } from "@/api/hooks/useOrders"

const PAGE_SIZE = 20

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  N: "outline",
  P: "default",
  C: "secondary",
  T: "outline",
  A: "secondary",
}

const columns: ColumnDef<OrderListItem, unknown>[] = [
  {
    accessorKey: "order_number",
    header: "№",
    size: 80,
    cell: ({ row }) => <span className="font-medium">{row.original.order_number}</span>,
  },
  {
    accessorKey: "status",
    header: "Статус",
    size: 120,
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status] ?? "outline"}>
        {row.original.status_display}
      </Badge>
    ),
  },
  { accessorKey: "customer_name", header: "Заказчик" },
  { accessorKey: "tender_number", header: "Тендер", size: 130 },
  { accessorKey: "start_date", header: "Дата начала", size: 120 },
  { accessorKey: "ship_date", header: "Дата отгрузки", size: 130 },
  {
    accessorKey: "note",
    header: "Примечание",
    cell: ({ row }) => (
      <span className="line-clamp-1 text-muted-foreground">{row.original.note}</span>
    ),
  },
]

export function OrdersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [deleteItem, setDeleteItem] = useState<OrderListItem | null>(null)

  const listParams: ListParams = { page, page_size: PAGE_SIZE }
  if (search) listParams.search = search
  if (statusFilter && statusFilter !== "all") listParams.status = statusFilter

  const { data, isLoading } = useOrderList(listParams)
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

  const columnsWithActions: ColumnDef<OrderListItem, unknown>[] = [
    ...columns,
    {
      id: "actions",
      size: 50,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/orders/${row.original.order_number}/edit`)
            }}
          >
            Изм.
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteItem(row.original)
            }}
          >
            Уд.
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Заказы</h1>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(val) => { setStatusFilter(val); setPage(1) }}
        >
          <SelectTrigger className="w-[180px]">
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

      <DataTable
        columns={columnsWithActions}
        data={data?.results ?? []}
        totalCount={data?.count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => { setPage(p); setSelectedRows({}) }}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); setSelectedRows({}) }}
        isLoading={isLoading}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        enableSelection={false}
        onRowClick={(row) => navigate(`/orders/${row.order_number}`)}
        toolbar={
          <Button size="sm" onClick={() => navigate("/orders/new")}>
            <Plus className="size-4 mr-1" />
            Создать
          </Button>
        }
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
