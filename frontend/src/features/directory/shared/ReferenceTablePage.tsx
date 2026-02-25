import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import type { z } from "zod"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EntityFormDialog } from "@/components/shared/EntityFormDialog"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import type { BaseEntity, ListParams } from "@/api/types"
import type { DirectoryQueryHooks } from "@/api/hooks/useDirectoryQuery"

export interface FormFieldConfig {
  name: string
  label: string
  type?: "text" | "textarea"
  placeholder?: string
}

interface ReferenceTablePageProps<T extends BaseEntity> {
  title: string
  columns: ColumnDef<T, unknown>[]
  formSchema: z.ZodType<Record<string, unknown>>
  formFields: FormFieldConfig[]
  queryHooks: DirectoryQueryHooks<T>
  defaultValues: Record<string, unknown>
  pageSize?: number
}

export function ReferenceTablePage<T extends BaseEntity>({
  title,
  columns,
  formSchema,
  formFields,
  queryHooks,
  defaultValues,
  pageSize = 20,
}: ReferenceTablePageProps<T>) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<T | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[] | null>(null)

  const listParams: ListParams = { page, page_size: pageSize }
  if (search) listParams.search = search

  const { data, isLoading } = queryHooks.useList(listParams)
  const createMutation = queryHooks.useCreate()
  const updateMutation = queryHooks.useUpdate()
  const deleteMutation = queryHooks.useDelete()
  const bulkDeleteMutation = queryHooks.useBulkDelete()

  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: defaultValues as Record<string, unknown>,
  })

  const handleOpenCreate = () => {
    setEditingItem(null)
    form.reset(defaultValues)
    setFormOpen(true)
  }

  const handleOpenEdit = (item: T) => {
    setEditingItem(item)
    form.reset(item as unknown as Record<string, unknown>)
    setFormOpen(true)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: values as Partial<T> })
        toast.success("Запись обновлена")
      } else {
        await createMutation.mutateAsync(values as Partial<T>)
        toast.success("Запись создана")
      }
      setFormOpen(false)
      form.reset(defaultValues)
    } catch {
      toast.error("Ошибка при сохранении")
    }
  })

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await deleteMutation.mutateAsync(deleteItem.id)
      toast.success("Запись удалена")
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

  const columnsWithActions: ColumnDef<T, unknown>[] = [
    ...columns,
    {
      id: "actions",
      size: 50,
      cell: ({ row }) => (
        <DataTableRowActions
          onEdit={() => handleOpenEdit(row.original)}
          onDelete={() => setDeleteItem(row.original)}
        />
      ),
    },
  ]

  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <DataTable
        columns={columnsWithActions}
        data={data?.results ?? []}
        totalCount={data?.count ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => {
          setPage(p)
          setSelectedRows({})
        }}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
          setSelectedRows({})
        }}
        isLoading={isLoading}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        onBulkDelete={(ids) => setBulkDeleteIds(ids)}
        toolbar={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="size-4 mr-1" />
            Добавить
          </Button>
        }
      />

      {/* Create/Edit Dialog */}
      <EntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingItem ? "Редактирование" : "Создание"}
      >
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formFields.map((field) => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    <FormControl>
                      {field.type === "textarea" ? (
                        <textarea
                          {...formField}
                          value={formField.value as string ?? ""}
                          placeholder={field.placeholder}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      ) : (
                        <Input
                          {...formField}
                          value={formField.value as string ?? ""}
                          placeholder={field.placeholder}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </EntityFormDialog>

      {/* Single Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null) }}
        title="Удалить запись?"
        description="Это действие нельзя отменить. Запись будет удалена безвозвратно."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        open={!!bulkDeleteIds}
        onOpenChange={(open) => { if (!open) setBulkDeleteIds(null) }}
        title="Удалить выбранные записи?"
        description={`Будет удалено записей: ${bulkDeleteIds?.length ?? 0}. Это действие нельзя отменить.`}
        onConfirm={handleBulkDelete}
        loading={bulkDeleteMutation.isPending}
      />
    </div>
  )
}
