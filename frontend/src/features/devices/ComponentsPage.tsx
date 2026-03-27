import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Search, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/shared/DataTable"
import type { DeviceComponent, ListParams } from "@/api/types"
import { deviceComponentHooks, useTriggerComponentImport } from "@/api/hooks/useDevices"
import { useDebounce } from "@/hooks/useDebounce"

const PAGE_SIZE = 50

export function ComponentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [activeFilter, setActiveFilter] = useState<string>("true")

  const params: ListParams = { page, page_size: PAGE_SIZE }
  if (debouncedSearch) params.search = debouncedSearch
  if (activeFilter) params.is_active = activeFilter

  const { data, isLoading } = deviceComponentHooks.useList(params)
  const importMutation = useTriggerComponentImport()

  const handleImport = async () => {
    try {
      await importMutation.mutateAsync()
      toast.success("Импорт компонентов запущен")
    } catch {
      toast.error("Ошибка запуска импорта")
    }
  }

  const columns: ColumnDef<DeviceComponent, unknown>[] = [
    { accessorKey: "produx_id", header: "ProdUX ID", size: 100 },
    { accessorKey: "component_name", header: "Наименование" },
    { accessorKey: "component_type_name", header: "Тип", size: 200 },
    {
      accessorKey: "is_active",
      header: "Статус",
      size: 100,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="size-3" /> Активен
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="size-3" /> Неактивен
          </Badge>
        ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Компоненты терминалов</h1>
        <Button onClick={handleImport} variant="outline" size="sm" disabled={importMutation.isPending}>
          <RefreshCw className={`mr-1 size-4 ${importMutation.isPending ? "animate-spin" : ""}`} />
          Синхронизация ProdUX
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Все</option>
          <option value="true">Активные</option>
          <option value="false">Неактивные</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        pageCount={data ? Math.ceil(data.count / PAGE_SIZE) : 0}
        pageIndex={page - 1}
        onPageChange={(p) => setPage(p + 1)}
        isLoading={isLoading}
      />
    </div>
  )
}
