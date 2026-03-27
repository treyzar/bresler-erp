import { useState } from "react"
import { useNavigate } from "react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Search, Cpu } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import type { DeviceRZA, ListParams } from "@/api/types"
import {
  useDeviceRZAList,
  useCreateDeviceRZA,
  useUpdateDeviceRZA,
  useDeleteDeviceRZA,
} from "@/api/hooks/useDevices"
import { useDebounce } from "@/hooks/useDebounce"

const PAGE_SIZE = 50

const formSchema = z.object({
  rza_name: z.string().min(1, "Обязательное поле"),
  rza_code: z.string().min(1, "Обязательное поле"),
  rza_short_name: z.string().optional().default(""),
  rza_name_rod: z.string().optional().default(""),
})

type FormValues = z.infer<typeof formSchema>

export function DevicesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DeviceRZA | null>(null)
  const [deleteItem, setDeleteItem] = useState<DeviceRZA | null>(null)

  const params: ListParams = { page, page_size: PAGE_SIZE }
  if (debouncedSearch) params.search = debouncedSearch

  const { data, isLoading } = useDeviceRZAList(params)
  const createMutation = useCreateDeviceRZA()
  const updateMutation = useUpdateDeviceRZA()
  const deleteMutation = useDeleteDeviceRZA()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { rza_name: "", rza_code: "", rza_short_name: "", rza_name_rod: "" },
  })

  const columns: ColumnDef<DeviceRZA, unknown>[] = [
    { accessorKey: "rza_code", header: "Код", size: 120 },
    {
      accessorKey: "rza_name",
      header: "Наименование",
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/devices/rza/${row.original.id}`)}
          className="hover:underline text-left font-medium"
        >
          {row.original.rza_name}
        </button>
      ),
    },
    { accessorKey: "rza_short_name", header: "Сокращение", size: 160 },
    { accessorKey: "modifications_count", header: "Модификации", size: 130 },
    { accessorKey: "parameters_count", header: "Параметры", size: 120 },
    { accessorKey: "components_count", header: "Компоненты", size: 120 },
  ]

  const openCreate = () => {
    setEditingItem(null)
    form.reset({ rza_name: "", rza_code: "", rza_short_name: "", rza_name_rod: "" })
    setFormOpen(true)
  }

  const openEdit = (item: DeviceRZA) => {
    setEditingItem(item)
    form.reset({
      rza_name: item.rza_name,
      rza_code: item.rza_code,
      rza_short_name: item.rza_short_name,
      rza_name_rod: item.rza_name_rod,
    })
    setFormOpen(true)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: values })
        toast.success("Устройство обновлено")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Устройство создано")
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
      toast.success("Устройство удалено")
      setDeleteItem(null)
    } catch {
      toast.error("Ошибка при удалении")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="size-5" />
          <h1 className="text-2xl font-semibold">Устройства РЗА</h1>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 size-4" /> Добавить
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или коду..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        pageCount={data ? Math.ceil(data.count / PAGE_SIZE) : 0}
        pageIndex={page - 1}
        onPageChange={(p) => setPage(p + 1)}
        isLoading={isLoading}
        onRowAction={(row) => navigate(`/devices/rza/${row.id}`)}
        onEditAction={openEdit}
        onDeleteAction={(row) => setDeleteItem(row)}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Редактировать устройство" : "Новое устройство"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField control={form.control} name="rza_code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Функциональный код</FormLabel>
                  <FormControl><Input placeholder="200" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="rza_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Наименование</FormLabel>
                  <FormControl><Input placeholder="Защита линии 6–35 кВ" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="rza_short_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Сокращённое наименование</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="rza_name_rod" render={({ field }) => (
                <FormItem>
                  <FormLabel>Наименование (род. падеж)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Отмена</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? "Сохранить" : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="Удалить устройство?"
        description={`Устройство «${deleteItem?.rza_name}» будет удалено вместе с модификациями.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
