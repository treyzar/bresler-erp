import { useState } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import type { Contact, ListParams } from "@/api/types"
import { contactHooks } from "@/api/hooks/useContacts"
import { ContactForm } from "./ContactForm"

const PAGE_SIZE = 20

const columns: ColumnDef<Contact, unknown>[] = [
  { accessorKey: "full_name", header: "ФИО" },
  { accessorKey: "position", header: "Должность", size: 160 },
  { accessorKey: "email", header: "Email", size: 200 },
  { accessorKey: "phone", header: "Телефон", size: 150 },
  { accessorKey: "company", header: "Компания", size: 180 },
]

export function ContactsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Contact | null>(null)
  const [deleteItem, setDeleteItem] = useState<Contact | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[] | null>(null)

  const listParams: ListParams = { page, page_size: PAGE_SIZE }
  if (search) listParams.search = search

  const { data, isLoading } = contactHooks.useList(listParams)
  const deleteMutation = contactHooks.useDelete()
  const bulkDeleteMutation = contactHooks.useBulkDelete()

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await deleteMutation.mutateAsync(deleteItem.id)
      toast.success("Контакт удалён")
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

  const columnsWithActions: ColumnDef<Contact, unknown>[] = [
    ...columns,
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Контакты</h1>
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

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null) }}
        title="Удалить контакт?"
        description="Это действие нельзя отменить. Контакт будет удалён безвозвратно."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={!!bulkDeleteIds}
        onOpenChange={(open) => { if (!open) setBulkDeleteIds(null) }}
        title="Удалить выбранные контакты?"
        description={`Будет удалено записей: ${bulkDeleteIds?.length ?? 0}. Это действие нельзя отменить.`}
        onConfirm={handleBulkDelete}
        loading={bulkDeleteMutation.isPending}
      />
    </div>
  )
}
