import { useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table"
import { Search, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/useDebounce"

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  searchValue: string
  onSearchChange: (value: string) => void
  isLoading?: boolean
  enableSelection?: boolean
  selectedRows?: RowSelectionState
  onSelectedRowsChange?: (rows: RowSelectionState) => void
  onBulkDelete?: (ids: number[]) => void
  toolbar?: React.ReactNode
  getRowId?: (row: T) => string
}

export function DataTable<T>({
  columns,
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
  searchValue,
  onSearchChange,
  isLoading = false,
  enableSelection = true,
  selectedRows = {},
  onSelectedRowsChange,
  onBulkDelete,
  toolbar,
  getRowId,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState(searchValue)
  const debouncedSearch = useDebounce(localSearch, 300)

  // Sync debounced value to parent
  if (debouncedSearch !== searchValue) {
    onSearchChange(debouncedSearch)
  }

  const selectionColumn: ColumnDef<T, unknown> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Выбрать все"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Выбрать строку"
      />
    ),
    size: 40,
    enableSorting: false,
  }

  const allColumns = enableSelection ? [selectionColumn, ...columns] : columns

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
    state: {
      rowSelection: selectedRows,
      pagination: { pageIndex: page - 1, pageSize },
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(selectedRows) : updater
      onSelectedRowsChange?.(next)
    },
    getRowId: getRowId ?? ((row) => String((row as Record<string, unknown>).id)),
  })

  const totalPages = Math.ceil(totalCount / pageSize)
  const selectedCount = Object.keys(selectedRows).length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && onBulkDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const ids = Object.keys(selectedRows).map(Number)
                onBulkDelete(ids)
              }}
            >
              <Trash2 className="size-4 mr-1" />
              Удалить ({selectedCount})
            </Button>
          )}
          {toolbar}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {allColumns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-24 text-center">
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Всего: {totalCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  )
}
