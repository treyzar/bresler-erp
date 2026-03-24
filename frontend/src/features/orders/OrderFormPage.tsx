import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { OrgUnitCombobox } from "@/components/shared/OrgUnitCombobox"
import { MultiSelect } from "@/components/shared/MultiSelect"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { OrgUnitBreadcrumb } from "@/components/shared/OrgUnitBreadcrumb"
import { ORDER_STATUSES, ORG_UNIT_BUSINESS_ROLES } from "@/api/types"
import {
  useOrder,
  useCreateOrder,
  useUpdateOrder,
  useNextOrderNumber,
} from "@/api/hooks/useOrders"
import { useFacilitiesByOrgUnits } from "@/api/hooks/useOrgUnits"
import { useReferenceOptions } from "./useReferenceOptions"
import { RelatedOrdersSelect } from "./RelatedOrdersSelect"

interface OrgUnitWithRole {
  org_unit: number
  org_unit_name: string
  role: string
}

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
  facilities: z.array(z.number()),
  related_orders: z.array(z.number()),
})

type FormValues = z.infer<typeof formSchema>

// Roles relevant for order org units (exclude legacy)
const ORDER_ROLES = Object.entries(ORG_UNIT_BUSINESS_ROLES)
  .filter(([key]) => !key.includes("Legacy") && key !== "buyer_branch" && key !== "shipment_site")
  .map(([value, label]) => ({ value, label }))

export function OrderFormPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const navigate = useNavigate()
  const isEdit = !!orderNumber

  const { data: order, isLoading: orderLoading } = useOrder(isEdit ? Number(orderNumber) : null)
  const { data: nextNumber } = useNextOrderNumber()
  const createMutation = useCreateOrder()
  const updateMutation = useUpdateOrder()
  const { countries, equipments, works, contacts, users } = useReferenceOptions()

  // Org units with roles (managed outside react-hook-form)
  const [orgUnits, setOrgUnits] = useState<OrgUnitWithRole[]>(() => {
    if (isEdit && order) {
      return order.order_org_units.map((ou) => ({
        org_unit: ou.org_unit,
        org_unit_name: ou.org_unit_name,
        role: ou.role,
      }))
    }
    return []
  })

  // Facilities/objects by selected OrgUnits
  const orgUnitIds = orgUnits.map((ou) => ou.org_unit)
  const { data: availableFacilities = [] } = useFacilitiesByOrgUnits(orgUnitIds)
  const facilityOptions = availableFacilities.map((f) => ({
    value: f.id,
    label: f.org_unit_name ? `${f.name} [${f.org_unit_name}]` : f.name,
  }))
  // Find Russia's ID for default country
  const russiaId = countries.find((c) => c.name === "Россия" || c.name === "Russia")?.id ?? null

  const equipmentOptions = equipments.map((e) => ({ value: e.id, label: e.name }))
  const worksOptions = works.map((w) => ({ value: w.id, label: w.name }))
  const managerOptions = users.map((u) => ({ value: u.id, label: u.full_name || u.username }))
  const contactOptions = contacts.map((c) => ({ value: c.id, label: c.full_name }))

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
          facilities: order.facility_ids,
          related_orders: order.related_orders,
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
          country: russiaId,
          contacts: [],
          managers: [],
          equipments: [],
          works: [],
          facilities: [],
          related_orders: [],
        },
  })

  // Sync orgUnits when order loads in edit mode
  if (isEdit && order && orgUnits.length === 0 && order.order_org_units.length > 0) {
    setOrgUnits(order.order_org_units.map((ou) => ({
      org_unit: ou.org_unit,
      org_unit_name: ou.org_unit_name,
      role: ou.role,
    })))
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      start_date: values.start_date || null,
      ship_date: values.ship_date || null,
      org_units_data: orgUnits.map((ou) => ({
        org_unit: ou.org_unit,
        role: ou.role,
      })),
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
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown> } }
      const detail = axiosErr?.response?.data
      if (detail) {
        console.error("Order save error:", detail)
        const messages = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("; ")
        toast.error(`Ошибка: ${messages}`)
      } else {
        toast.error("Ошибка при сохранении")
      }
    }
  })

  const handleAddOrgUnit = (id: number, name: string) => {
    if (!orgUnits.some((ou) => ou.org_unit === id)) {
      setOrgUnits([...orgUnits, { org_unit: id, org_unit_name: name, role: "" }])
    }
  }

  const handleRemoveOrgUnit = (id: number) => {
    setOrgUnits(orgUnits.filter((ou) => ou.org_unit !== id))
  }

  const handleOrgUnitRoleChange = (id: number, role: string) => {
    setOrgUnits(orgUnits.map((ou) => ou.org_unit === id ? { ...ou, role } : ou))
  }

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? `Редактирование заказа #${order?.order_number}` : "Новый заказ"}
      </h1>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left column */}
            <div className="space-y-6">
              {/* 1. Общие сведения */}
              <Card>
                <CardHeader>
                  <CardTitle>Общие сведения</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="order_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Номер заказа</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              disabled={!isEdit}
                              placeholder={!isEdit ? "Автоматически" : undefined}
                            />
                          </FormControl>
                          <FormMessage />
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
                  </div>
                  <FormField
                    control={form.control}
                    name="related_orders"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Связанные заказы</FormLabel>
                        <FormControl>
                          <RelatedOrdersSelect
                            value={field.value}
                            onChange={field.onChange}
                            excludeOrderNumber={isEdit ? Number(orderNumber) : undefined}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="managers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Менеджеры</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={managerOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Выберите менеджеров..."
                            searchPlaceholder="Поиск по имени..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата запуска</FormLabel>
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
                  </div>
                </CardContent>
              </Card>

              {/* 3. Сведения об оборудовании и работах */}
              <Card>
                <CardHeader>
                  <CardTitle>Сведения об оборудовании и работах</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="equipments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Оборудование</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={equipmentOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Выберите оборудование..."
                            searchPlaceholder="Поиск оборудования..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="works"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Виды работ</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={worksOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Выберите виды работ..."
                            searchPlaceholder="Поиск видов работ..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* 2. Организация (структура) */}
              <Card>
                <CardHeader>
                  <CardTitle>Организация (структура)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Страна</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={countries.map((c) => ({ value: String(c.id), label: c.name }))}
                            value={field.value?.toString() ?? ""}
                            onChange={(v) => field.onChange(v ? Number(v) : null)}
                            placeholder="Выберите страну..."
                            searchPlaceholder="Поиск страны..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel>Организации</FormLabel>
                    <div className="mt-2">
                      <OrgUnitCombobox
                        mode="single"
                        value={null}
                        onChange={() => {}}
                        onSelectItem={(id, name) => handleAddOrgUnit(id, name)}
                      />
                    </div>
                    {orgUnits.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {orgUnits.map((ou) => (
                          <div key={ou.org_unit} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-semibold">
                                  {ou.org_unit_name}
                                </span>
                                <div className="mt-1">
                                  <OrgUnitBreadcrumb orgUnitId={ou.org_unit} orgUnitName={ou.org_unit_name} />
                                </div>
                              </div>
                              <Select
                                value={ou.role || "__none__"}
                                onValueChange={(val) => handleOrgUnitRoleChange(ou.org_unit, val === "__none__" ? "" : val)}
                              >
                                <SelectTrigger className="w-[200px] h-8 text-xs shrink-0">
                                  <SelectValue placeholder="Роль..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Без роли</SelectItem>
                                  {ORDER_ROLES.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => handleRemoveOrgUnit(ou.org_unit)}
                              >
                                <X className="size-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Объекты по организации */}
                    {orgUnits.length > 0 && (
                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="facilities"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Объекты (по организации)</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={facilityOptions}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Выберите объекты..."
                                  searchPlaceholder="Поиск объектов..."
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 4. Сведения о закупке */}
              <Card>
                <CardHeader>
                  <CardTitle>Сведения о закупке</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* 5. Дополнительные сведения */}
              <Card>
                <CardHeader>
                  <CardTitle>Дополнительные сведения</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contacts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Контакты</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={contactOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Выберите контакты..."
                            searchPlaceholder="Поиск контактов..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
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
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

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
