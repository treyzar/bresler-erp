import { useNavigate, useParams } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { OrgUnitCombobox } from "@/components/shared/OrgUnitCombobox"
import { ORDER_STATUSES } from "@/api/types"
import {
  useOrder,
  useCreateOrder,
  useUpdateOrder,
  useNextOrderNumber,
} from "@/api/hooks/useOrders"
import { useReferenceOptions } from "./useReferenceOptions"

const formSchema = z.object({
  order_number: z.number().int().positive("Обязательное поле"),
  tender_number: z.string(),
  status: z.string(),
  note: z.string(),
  start_date: z.string(),
  ship_date: z.string(),
  customer_org_unit: z.number().nullable(),
  intermediary: z.number().nullable(),
  designer: z.number().nullable(),
  country: z.number().nullable(),
  contacts: z.array(z.number()),
  managers: z.array(z.number()),
  equipments: z.array(z.number()),
  works: z.array(z.number()),
})

type FormValues = z.infer<typeof formSchema>

export function OrderFormPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const navigate = useNavigate()
  const isEdit = !!orderNumber

  const { data: order, isLoading: orderLoading } = useOrder(isEdit ? Number(orderNumber) : null)
  const { data: nextNumber } = useNextOrderNumber()
  const createMutation = useCreateOrder()
  const updateMutation = useUpdateOrder()
  const { intermediaries, designers, countries } = useReferenceOptions()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: isEdit && order
      ? {
          order_number: order.order_number,
          tender_number: order.tender_number,
          status: order.status,
          note: order.note,
          start_date: order.start_date ?? "",
          ship_date: order.ship_date ?? "",
          customer_org_unit: order.customer_org_unit,
          intermediary: order.intermediary,
          designer: order.designer,
          country: order.country,
          contacts: order.contact_ids,
          managers: order.manager_ids,
          equipments: order.equipment_ids,
          works: order.work_ids,
        }
      : {
          order_number: nextNumber ?? 0,
          tender_number: "",
          status: "N",
          note: "",
          start_date: "",
          ship_date: "",
          customer_org_unit: null,
          intermediary: null,
          designer: null,
          country: null,
          contacts: [],
          managers: [],
          equipments: [],
          works: [],
        },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      start_date: values.start_date || null,
      ship_date: values.ship_date || null,
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: Number(orderNumber), data: payload })
        toast.success("Заказ обновлён")
        navigate(`/orders/${orderNumber}`)
      } else {
        const created = await createMutation.mutateAsync(payload)
        toast.success("Заказ создан")
        navigate(`/orders/${created.order_number}`)
      }
    } catch {
      toast.error("Ошибка при сохранении")
    }
  })

  const isMutating = createMutation.isPending || updateMutation.isPending

  if (isEdit && orderLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? `Редактирование заказа #${order?.order_number}` : "Новый заказ"}
      </h1>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="order_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер заказа</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tender_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер тендера</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ORDER_STATUSES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div /> {/* spacer */}
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата начала</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ship_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата отгрузки</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Примечание</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Связи</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_org_unit"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Заказчик</FormLabel>
                    <FormControl>
                      <OrgUnitCombobox
                        mode="single"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
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
                      onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                      value={field.value?.toString() ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Не выбрана" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="intermediary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Посредник</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                      value={field.value?.toString() ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Не выбран" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {intermediaries.map((i) => (
                          <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Проектант</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                      value={field.value?.toString() ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Не выбран" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {designers.map((d) => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
