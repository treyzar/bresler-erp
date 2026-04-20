import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import type { Facility, ListParams } from "@/api/types"
import { facilityHooks } from "@/api/hooks/useFacilities"
import { useOrgUnitList } from "@/api/hooks/useOrgUnits"


const PAGE_SIZE = 20

const formSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  org_unit: z.number().nullable(),
  address: z.string(),
  description: z.string(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const columns: ColumnDef<Facility, unknown>[] = [
  { accessorKey: "name", header: "Название" },
  { accessorKey: "org_unit_name", header: "Организация", size: 200 },
  { accessorKey: "address", header: "Адрес", size: 250 },
  {
    accessorKey: "description",
    header: "Описание",
    size: 240,
    cell: ({ getValue }) => {
      const v = getValue() as string | null
      if (!v) return <span className="text-muted-foreground">—</span>
      return <span className="line-clamp-2 text-sm" title={v}>{v}</span>
    },
  },
  {
    accessorKey: "is_active",
    header: "Статус",
    size: 100,
    cell: ({ getValue }) =>
      getValue() ? (
        <Badge variant="default">Активен</Badge>
      ) : (
        <Badge variant="secondary">Неактивен</Badge>
      ),
  },
]

export function FacilitiesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Facility | null>(null)
  const [deleteItem, setDeleteItem] = useState<Facility | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[] | null>(null)

  const listParams: ListParams = { page, page_size: PAGE_SIZE }
  if (search) listParams.search = search

  const { data, isLoading } = facilityHooks.useList(listParams)
  const createMutation = facilityHooks.useCreate()
  const updateMutation = facilityHooks.useUpdate()
  const deleteMutation = facilityHooks.useDelete()
  const bulkDeleteMutation = facilityHooks.useBulkDelete()

  const { data: orgUnitsData } = useOrgUnitList({ page_size: 500, is_active: true })
  const orgUnitOptions = orgUnitsData?.results ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", org_unit: null, address: "", description: "", is_active: true },
  })

  const handleOpenCreate = () => {
    setEditingItem(null)
    form.reset({ name: "", org_unit: null, address: "", description: "", is_active: true })
    setFormOpen(true)
  }

  const handleOpenEdit = (item: Facility) => {
    setEditingItem(item)
    form.reset({
      name: item.name,
      org_unit: item.org_unit,
      address: item.address,
      description: item.description,
      is_active: item.is_active,
    })
    setFormOpen(true)
  }

  const handleSubmit = async (values: FormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: values })
        toast.success("Объект обновлён")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Объект создан")
      }
      setFormOpen(false)
    } catch {
      toast.error("Ошибка при сохранении")
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await deleteMutation.mutateAsync(deleteItem.id)
      toast.success("Объект удалён")
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

  const columnsWithActions: ColumnDef<Facility, unknown>[] = [
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Объекты</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Места установки и поставки оборудования
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      <DataTable
        columns={columnsWithActions}
        data={data?.results ?? []}
        isLoading={isLoading}
        totalCount={data?.count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        onBulkDelete={(ids) => setBulkDeleteIds(ids)}
      />

      <EntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingItem ? "Редактировать объект" : "Добавить объект"}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название *</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: РП-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="org_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Организация</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))}
                    value={field.value != null ? String(field.value) : "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите организацию" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">— Не выбрано —</SelectItem>
                      {orgUnitOptions.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Адрес</FormLabel>
                  <FormControl>
                    <Input placeholder="Адрес объекта" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Дополнительное описание" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Статус</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Активен</SelectItem>
                      <SelectItem value="false">Неактивен</SelectItem>
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
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </form>
        </Form>
      </EntityFormDialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Удалить объект?"
        description={`Объект "${deleteItem?.name}" будет удалён безвозвратно.`}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={!!bulkDeleteIds}
        onOpenChange={(open) => !open && setBulkDeleteIds(null)}
        title="Удалить выбранные объекты?"
        description={`Будет удалено ${bulkDeleteIds?.length} объектов.`}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
