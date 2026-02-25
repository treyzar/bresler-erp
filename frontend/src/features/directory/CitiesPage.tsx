import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { z } from "zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EntityFormDialog } from "@/components/shared/EntityFormDialog"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import type { City, ListParams } from "@/api/types"
import { cityHooks } from "@/api/hooks/useCities"
import { countryHooks } from "@/api/hooks/useCountries"

const PAGE_SIZE = 20

const formSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  country: z.number().int().min(1, "Выберите страну"),
})

type FormValues = z.infer<typeof formSchema>

const columns: ColumnDef<City, unknown>[] = [
  { accessorKey: "id", header: "ID", size: 80 },
  { accessorKey: "name", header: "Название" },
  { accessorKey: "country_name", header: "Страна", size: 200 },
]

export function CitiesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [editingItem, setEditingItem] = useState<City | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<City | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[] | null>(null)

  const listParams: ListParams = { page, page_size: PAGE_SIZE }
  if (search) listParams.search = search

  const { data, isLoading } = cityHooks.useList(listParams)
  const createMutation = cityHooks.useCreate()
  const updateMutation = cityHooks.useUpdate()
  const deleteMutation = cityHooks.useDelete()
  const bulkDeleteMutation = cityHooks.useBulkDelete()

  const { data: countriesData } = countryHooks.useList({ page_size: 200 })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", country: 0 },
  })

  const handleOpenCreate = () => {
    setEditingItem(null)
    form.reset({ name: "", country: 0 })
    setFormOpen(true)
  }

  const handleOpenEdit = (item: City) => {
    setEditingItem(item)
    form.reset({ name: item.name, country: item.country })
    setFormOpen(true)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: values as Partial<City> })
        toast.success("Город обновлён")
      } else {
        await createMutation.mutateAsync(values as Partial<City>)
        toast.success("Город создан")
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
      toast.success("Город удалён")
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

  const columnsWithActions: ColumnDef<City, unknown>[] = [
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
        <h1 className="text-2xl font-bold">Города</h1>
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
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="size-4 mr-1" />
            Добавить
          </Button>
        }
      />

      <EntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingItem ? "Редактирование города" : "Создание города"}
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
                    <Input {...field} placeholder="Москва" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Страна</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? String(field.value) : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите страну" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countriesData?.results.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
        title="Удалить город?"
        description="Это действие нельзя отменить. Город будет удалён безвозвратно."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={!!bulkDeleteIds}
        onOpenChange={(open) => { if (!open) setBulkDeleteIds(null) }}
        title="Удалить выбранные города?"
        description={`Будет удалено записей: ${bulkDeleteIds?.length ?? 0}. Это действие нельзя отменить.`}
        onConfirm={handleBulkDelete}
        loading={bulkDeleteMutation.isPending}
      />
    </div>
  )
}
