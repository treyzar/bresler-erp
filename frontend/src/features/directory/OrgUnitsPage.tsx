import { useState, useCallback } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { ChevronRight, FolderOpen, LayoutList, Plus, Network, Info } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/shared/DataTable"
import { AutoFilters } from "@/components/shared/AutoFilters"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import type { OrgUnit, ListParams } from "@/api/types"
import { orgUnitHooks, useOrgUnitList, useOrgUnitAncestors, useOrgUnitTree } from "@/api/hooks/useOrgUnits"
import { useFilterMeta } from "@/api/hooks/useFilterMeta"
import { useAutoFilters } from "@/hooks/useAutoFilters"
import { OrgUnitForm } from "./OrgUnitForm"
import { OrgUnitTreeView } from "./OrgUnitTreeView"
import { OrgUnitInfoDrawer } from "./OrgUnitInfoDrawer"
import { UNIT_TYPES, BUSINESS_ROLES } from "@/lib/constants"

const PAGE_SIZE = 20

export function OrgUnitsPage() {
  const [view, setView] = useState<"table" | "tree">("table")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [parentId, setParentId] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  
  // Drawer states
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false)
  const [infoId, setInfoId] = useState<number | null>(null)

  // Form states
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrgUnit | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Delete states
  const [deleteItem, setDeleteItem] = useState<OrgUnit | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[] | null>(null)
  
  // Metadata-driven filters
  const { data: meta } = useFilterMeta("/directory/orgunits/")
  const { values: filterValues, setValue: setFilterValue, reset: resetFilters, hasActiveFilters, params: filterParams } = useAutoFilters(meta?.filters)

  const listParams: ListParams = { page, page_size: PAGE_SIZE, ...filterParams }
  if (search) listParams.search = search
  if (parentId !== null && !search) listParams.parent = parentId

  const { data, isLoading } = useOrgUnitList(listParams)
  const { data: treeData, isLoading: isTreeLoading } = useOrgUnitTree()
  const { data: ancestors = [] } = useOrgUnitAncestors(parentId)
  const deleteMutation = orgUnitHooks.useDelete()
  const bulkDeleteMutation = orgUnitHooks.useBulkDelete()

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val)
    setPage(1)
    setSelectedRows({})
  }, [])

  const handleDrillDown = (orgUnit: OrgUnit) => {
    if (orgUnit.children_count > 0) {
      setParentId(orgUnit.id)
      setPage(1)
      setSearch("")
      setSelectedRows({})
    }
  }

  const handleOpenInfo = (id: number) => {
    setInfoId(id)
    setInfoDrawerOpen(true)
  }

  const handleBreadcrumbClick = (id: number | null) => {
    setParentId(id)
    setPage(1)
    setSearch("")
    setSelectedRows({})
  }

  const handleDelete = async () => {
    const id = deleteId ?? deleteItem?.id
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Организация удалена")
      setDeleteItem(null)
      setDeleteId(null)
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
              onClick={(e) => {
                e.stopPropagation()
                handleOpenInfo(org.id)
              }}
              className="hover:underline text-left font-medium"
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
            setEditingId(null)
            setFormOpen(true)
          }}
          onDelete={() => setDeleteItem(row.original)}
        >
           <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => handleOpenInfo(row.original.id)}
            title="Информация"
          >
            <Info className="size-4" />
          </Button>
        </DataTableRowActions>
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
        <div className="flex items-center gap-4">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <LayoutList className="size-4" />
                Таблица
              </TabsTrigger>
              <TabsTrigger value="tree" className="flex items-center gap-2">
                <Network className="size-4" />
                Дерево
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null)
              setEditingId(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4 mr-1" />
            Добавить
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <div className="space-y-6">
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

          {/* Metadata-driven filters */}
          {meta?.filters && (
            <AutoFilters
              filters={meta.filters}
              values={filterValues}
              onChange={(name, val) => { setFilterValue(name, val); setPage(1) }}
              onReset={() => { resetFilters(); setPage(1) }}
              hasActiveFilters={hasActiveFilters}
              defaultOpen
            />
          )}

          <DataTable
            columns={columns}
            data={data?.results ?? []}
            totalCount={data?.count ?? 0}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => { setPage(p); setSelectedRows({}) }}
            searchValue={search}
            onSearchChange={handleSearchChange}
            isLoading={isLoading}
            selectedRows={selectedRows}
            onSelectedRowsChange={setSelectedRows}
            onBulkDelete={(ids) => setBulkDeleteIds(ids)}
            onRowClick={(row) => handleOpenInfo(row.id)}
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4 min-h-[400px]">
          {isTreeLoading ? (
            <div className="flex items-center justify-center h-40">
              <span className="text-muted-foreground">Загрузка дерева...</span>
            </div>
          ) : treeData && treeData.length > 0 ? (
            <OrgUnitTreeView
              data={treeData}
              onEdit={(id) => {
                setEditingId(id)
                setEditingItem(null)
                setFormOpen(true)
              }}
              onDelete={(id) => setDeleteId(id)}
            />
          ) : (
            <div className="flex items-center justify-center h-40">
              <span className="text-muted-foreground">Организаций не найдено</span>
            </div>
          )}
        </div>
      )}

      <OrgUnitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
        editingId={editingId}
        parentId={parentId}
      />

      <OrgUnitInfoDrawer
        id={infoId}
        open={infoDrawerOpen}
        onOpenChange={setInfoDrawerOpen}
      />

      <ConfirmDialog
        open={!!deleteItem || !!deleteId}
        onOpenChange={(open) => { if (!open) { setDeleteItem(null); setDeleteId(null) } }}
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
