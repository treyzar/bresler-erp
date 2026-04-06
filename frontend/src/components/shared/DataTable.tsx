import { useState, useEffect } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Search, Trash2, Settings2, ArrowRight } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebounce } from "@/hooks/useDebounce"

const PAGE_SIZE_OPTIONS = [20, 50, 100]

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
  enableSearch?: boolean
  selectedRows?: RowSelectionState
  onSelectedRowsChange?: (rows: RowSelectionState) => void
  onBulkDelete?: (ids: number[]) => void
  toolbar?: React.ReactNode
  getRowId?: (row: T) => string
  onRowClick?: (row: T) => void
  getRowHref?: (row: T) => string
  fixedLayout?: boolean
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
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
  enableSearch = true,
  selectedRows = {},
  onSelectedRowsChange,
  onBulkDelete,
  toolbar,
  getRowId,
  onRowClick,
  getRowHref,
  fixedLayout = false,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState(searchValue)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const debouncedSearch = useDebounce(localSearch, 300)

  // Sync from outside (parent -> local)
  useEffect(() => {
    setLocalSearch(searchValue)
  }, [searchValue])

  // Sync to outside (local -> parent)
  // ONLY if enableSearch is true, otherwise the parent is in full control
  useEffect(() => {
    if (enableSearch && debouncedSearch !== searchValue) {
      onSearchChange(debouncedSearch)
    }
  }, [debouncedSearch, searchValue, onSearchChange, enableSearch])

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
    enableHiding: false,
  }

  const allColumns = enableSelection ? [selectionColumn, ...columns] : columns

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      rowSelection: selectedRows,
      columnVisibility,
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
  const [gotoPage, setGotoPage] = useState("")

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {enableSearch ? (
            <div className="flex items-center flex-1 gap-2 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          ) : null}
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Показывать:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => onPageSizeChange(Number(val))}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto flex h-9">
                <Settings2 className="mr-2 h-4 w-4" />
                Вид
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>Отображение колонок</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {/* Try to get a string header, otherwise use ID */}
                      {typeof column.columnDef.header === "string" 
                        ? column.columnDef.header 
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {toolbar}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table className={fixedLayout ? "table-fixed" : undefined}>
          <colgroup>
            {(() => {
              const visibleCols = table.getVisibleFlatColumns()
              const totalSize = visibleCols.reduce((sum, col) => sum + col.getSize(), 0)
              return visibleCols.map((col) => (
                <col
                  key={col.id}
                  style={{ width: `${(col.getSize() / totalSize) * 100}%` }}
                />
              ))
            })()}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  {table.getVisibleFlatColumns().map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={(e) => {
                    if (onRowClick) {
                      if (e.ctrlKey || e.metaKey) {
                        const href = getRowHref?.(row.original)
                        if (href) window.open(href, "_blank")
                      } else {
                        onRowClick(row.original)
                      }
                    }
                  }}
                  onAuxClick={(e) => {
                    if (e.button === 1 && getRowHref) {
                      e.preventDefault()
                      window.open(getRowHref(row.original), "_blank")
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleFlatColumns().length} className="h-24 text-center">
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
          {totalCount > 0
            ? `Записи с ${(page - 1) * pageSize + 1} до ${Math.min(page * pageSize, totalCount)} из ${totalCount.toLocaleString("ru")} записей`
            : "Нет записей"}
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
          {totalPages > 1 && (
            <div className="flex items-center gap-1 ml-2">
              <Input
                type="number"
                min={1}
                max={totalPages}
                placeholder="№"
                value={gotoPage}
                onChange={(e) => setGotoPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const p = Number(gotoPage)
                    if (p >= 1 && p <= totalPages) {
                      onPageChange(p)
                      setGotoPage("")
                    }
                  }
                }}
                className="w-[60px] h-8 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const p = Number(gotoPage)
                  if (p >= 1 && p <= totalPages) {
                    onPageChange(p)
                    setGotoPage("")
                  }
                }}
              >
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
