import { useState } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EntityFormDialog } from "@/components/shared/EntityFormDialog"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import type { PQ, ListParams } from "@/api/types"
import { pqHooks } from "@/api/hooks/usePQs"

const columns: ColumnDef<PQ, unknown>[] = [
  { accessorKey: "id", header: "ID", size: 80 },
  { accessorKey: "name", header: "Название" },
  { accessorKey: "full_name", header: "Полное название" },
  {
    accessorKey: "previous_names",
    header: "Предыдущие названия",
    cell: ({ getValue }) => {
      const names = getValue() as string[]
      return names?.length ? names.join(", ") : "—"
    },
  },
]

const formSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  full_name: z.string().optional().default(""),
  previous_names: z.array(z.object({ value: z.string() })).default([]),
})

type FormValues = z.infer<typeof formSchema>

export function PQPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [editingItem, setEditingItem] = useState<PQ | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<PQ | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[] | null>(null)

  const pageSize = 20
  const listParams: ListParams = { page, page_size: pageSize }
  if (search) listParams.search = search

  const { data, isLoading } = pqHooks.useList(listParams)
  const createMutation = pqHooks.useCreate()
  const updateMutation = pqHooks.useUpdate()
  const deleteMutation = pqHooks.useDelete()
  const bulkDeleteMutation = pqHooks.useBulkDelete()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", full_name: "", previous_names: [] },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "previous_names",
  })

  const handleOpenCreate = () => {
    setEditingItem(null)
    form.reset({ name: "", full_name: "", previous_names: [] })
    setFormOpen(true)
  }

  const handleOpenEdit = (item: PQ) => {
    setEditingItem(item)
    form.reset({
      name: item.name,
      full_name: item.full_name,
      previous_names: (item.previous_names ?? []).map((v) => ({ value: v })),
    })
    setFormOpen(true)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      full_name: values.full_name,
      previous_names: values.previous_names.map((p) => p.value).filter(Boolean),
    }
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload as Partial<PQ> })
        toast.success("Запись обновлена")
      } else {
        await createMutation.mutateAsync(payload as Partial<PQ>)
        toast.success("Запись создана")
      }
      setFormOpen(false)
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

  const columnsWithActions: ColumnDef<PQ, unknown>[] = [
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
        <h1 className="text-2xl font-bold">ПКЗ</h1>
      </div>

      <DataTable
        columns={columnsWithActions}
        data={data?.results ?? []}
        totalCount={data?.count ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => { setPage(p); setSelectedRows({}) }}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); setSelectedRows({}) }}
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

      <EntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingItem ? "Редактирование ПКЗ" : "Создание ПКЗ"}
      >
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Полное название</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Предыдущие названия</label>
              {fields.map((item, index) => (
                <div key={item.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`previous_names.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input {...field} placeholder="Предыдущее название" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => remove(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
              >
                <Plus className="size-4 mr-1" />
                Добавить
              </Button>
            </div>
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

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null) }}
        title="Удалить запись?"
        description="Это действие нельзя отменить. Запись будет удалена безвозвратно."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
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
