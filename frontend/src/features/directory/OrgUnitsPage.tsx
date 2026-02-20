import { useState } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { ChevronRight, FolderOpen, Plus } from "lucide-react"
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
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import type { OrgUnit, ListParams } from "@/api/types"
import { orgUnitHooks, useOrgUnitList, useOrgUnitAncestors } from "@/api/hooks/useOrgUnits"
import { OrgUnitForm } from "./OrgUnitForm"
import { UNIT_TYPES, BUSINESS_ROLES } from "@/lib/constants"

const PAGE_SIZE = 20

export function OrgUnitsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [parentId, setParentId] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrgUnit | null>(null)
  const [deleteItem, setDeleteItem] = useState<OrgUnit | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[] | null>(null)
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>("")
  const [businessRoleFilter, setBusinessRoleFilter] = useState<string>("")
  const [isActiveFilter, setIsActiveFilter] = useState<string>("")

  const listParams: ListParams = { page, page_size: PAGE_SIZE }
  if (search) listParams.search = search
  if (parentId !== null) listParams.parent = parentId
  if (unitTypeFilter) listParams.unit_type = unitTypeFilter
  if (businessRoleFilter) listParams.business_role = businessRoleFilter
  if (isActiveFilter) listParams.is_active = isActiveFilter

  const { data, isLoading } = useOrgUnitList(listParams)
  const { data: ancestors = [] } = useOrgUnitAncestors(parentId)
  const deleteMutation = orgUnitHooks.useDelete()
  const bulkDeleteMutation = orgUnitHooks.useBulkDelete()

  const handleDrillDown = (orgUnit: OrgUnit) => {
    if (orgUnit.children_count > 0) {
      setParentId(orgUnit.id)
      setPage(1)
      setSearch("")
      setSelectedRows({})
    }
  }

  const handleBreadcrumbClick = (id: number | null) => {
    setParentId(id)
    setPage(1)
    setSearch("")
    setSelectedRows({})
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await deleteMutation.mutateAsync(deleteItem.id)
      toast.success("Организация удалена")
      setDeleteItem(null)
    } catch {
      toast.error("Ошибка при удалении")
    }
  }

  const handleBulkDelete = async () => {
    if (!bulkDeleteIds) return
    try {
      await bulkDeleteMutation.mutateAsync(bulkDeleteIds)
      toast.success(`Удалено записей: ${bulkDeleteIds.length}`)
      setBulkDeleteIds(null)
      setSelectedRows({})
    } catch {
      toast.error("Ошибка при удалении")
    }
  }

  const columns: ColumnDef<OrgUnit, unknown>[] = [
    {
      accessorKey: "name",
      header: "Название",
      cell: ({ row }) => {
        const org = row.original
        return (
          <div className="flex items-center gap-2">
            {org.children_count > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDrillDown(org)
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <FolderOpen className="size-4" />
              </button>
            )}
            <button
              onClick={() => org.children_count > 0 && handleDrillDown(org)}
              className={org.children_count > 0 ? "hover:underline text-left" : "text-left"}
            >
              {org.name}
            </button>
            {org.children_count > 0 && (
              <span className="text-xs text-muted-foreground">({org.children_count})</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "unit_type",
      header: "Тип",
      size: 140,
      cell: ({ getValue }) => UNIT_TYPES[getValue() as keyof typeof UNIT_TYPES] ?? getValue(),
    },
    {
      accessorKey: "business_role",
      header: "Роль",
      size: 130,
      cell: ({ getValue }) => BUSINESS_ROLES[getValue() as keyof typeof BUSINESS_ROLES] ?? getValue(),
    },
    {
      accessorKey: "is_active",
      header: "Статус",
      size: 100,
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? "default" : "secondary"}>
          {getValue() ? "Активна" : "Неактивна"}
        </Badge>
      ),
    },
    {
      id: "actions",
      size: 50,
      cell: ({ row }) => (
        <DataTableRowActions
          onEdit={() => {
            setEditingItem(row.original)
            setFormOpen(true)
          }}
          onDelete={() => setDeleteItem(row.original)}
        />
      ),
    },
  ]

  // Build breadcrumb path
  const breadcrumbs: { id: number | null; name: string }[] = [
    { id: null, name: "Корень" },
    ...ancestors.map((a) => ({ id: a.id, name: a.name })),
  ]
  if (parentId !== null) {
    // Add current parent if not already in ancestors
    const currentInAncestors = ancestors.some((a) => a.id === parentId)
    if (!currentInAncestors) {
      const parentItem = data?.results.find((r) => r.id === parentId)
      if (parentItem) {
        breadcrumbs.push({ id: parentItem.id, name: parentItem.name })
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Организации</h1>
      </div>

      {/* Breadcrumbs */}
      {parentId !== null && (
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
              <button
                onClick={() => handleBreadcrumbClick(crumb.id)}
                className={
                  i === breadcrumbs.length - 1
                    ? "font-medium"
                    : "text-muted-foreground hover:text-foreground hover:underline"
                }
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={unitTypeFilter} onValueChange={(v) => { setUnitTypeFilter(v === "ALL" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все типы</SelectItem>
            {Object.entries(UNIT_TYPES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={businessRoleFilter} onValueChange={(v) => { setBusinessRoleFilter(v === "ALL" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все роли</SelectItem>
            {Object.entries(BUSINESS_ROLES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={isActiveFilter} onValueChange={(v) => { setIsActiveFilter(v === "ALL" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все</SelectItem>
            <SelectItem value="true">Активные</SelectItem>
            <SelectItem value="false">Неактивные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
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
        onBulkDelete={(ids) => setBulkDeleteIds(ids)}
        toolbar={
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4 mr-1" />
            Добавить
          </Button>
        }
      />

      <OrgUnitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
        parentId={parentId}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null) }}
        title="Удалить организацию?"
        description="Это действие нельзя отменить. Организация и все дочерние элементы будут удалены."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={!!bulkDeleteIds}
        onOpenChange={(open) => { if (!open) setBulkDeleteIds(null) }}
        title="Удалить выбранные организации?"
        description={`Будет удалено записей: ${bulkDeleteIds?.length ?? 0}. Это действие нельзя отменить.`}
        onConfirm={handleBulkDelete}
        loading={bulkDeleteMutation.isPending}
      />
    </div>
  )
}
