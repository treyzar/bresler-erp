import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
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
  FormDescription,
} from "@/components/ui/form"
import { EntityFormDialog } from "@/components/shared/EntityFormDialog"
import { OrgUnitCombobox } from "@/components/shared/OrgUnitCombobox"
import type { OrgUnit } from "@/api/types"
import { orgUnitHooks, useOrgUnitCreate } from "@/api/hooks/useOrgUnits"
import { countryHooks } from "@/api/hooks/useCountries"
import { UNIT_TYPES, BUSINESS_ROLES } from "@/lib/constants"

const formSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  full_name: z.string(),
  unit_type: z.string().min(1, "Обязательное поле"),
  business_role: z.string().min(1, "Обязательное поле"),
  is_legal_entity: z.boolean(),
  country: z.number().nullable(),
  parent: z.number().nullable(),
  inn: z.string(),
  kpp: z.string(),
  ogrn: z.string(),
  external_code: z.string(),
  address: z.string(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface OrgUnitFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem: OrgUnit | null
  editingId?: number | null
  parentId: number | null
}

export function OrgUnitForm({ open, onOpenChange, editingItem, editingId, parentId }: OrgUnitFormProps) {
  const createMutation = useOrgUnitCreate()
  const updateMutation = orgUnitHooks.useUpdate()
  const { data: countriesData } = countryHooks.useList({ page_size: 200 })

  const { data: fetchedItem, isLoading: isFetching } = orgUnitHooks.useGet(
    open && editingId && !editingItem ? editingId : null,
  )

  const currentItem = editingItem || fetchedItem

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      full_name: "",
      unit_type: "",
      business_role: "",
      is_legal_entity: false,
      country: null,
      parent: parentId,
      inn: "",
      kpp: "",
      ogrn: "",
      external_code: "",
      address: "",
      is_active: true,
    },
  })

  const unitType = form.watch("unit_type")
  const isRootLevel = unitType === "company"

  // Logic for what parent types are allowed for what child types (visual hint)
  const parentFilterText = useMemo(() => {
    switch (unitType) {
      case "branch": return "Выберите головную компанию"
      case "division": return "Выберите компанию или филиал"
      case "department": return "Выберите компанию, филиал или отделение"
      case "site": return "Выберите родительское подразделение"
      default: return "Выберите родительскую организацию"
    }
  }, [unitType])

  // Update form values when item is available or parentId changes
  useEffect(() => {
    if (currentItem) {
      form.reset({
        name: currentItem.name,
        full_name: currentItem.full_name,
        unit_type: currentItem.unit_type,
        business_role: currentItem.business_role,
        is_legal_entity: currentItem.is_legal_entity,
        country: currentItem.country,
        parent: null, // MP_Node hierarchy is complex to edit parent via normal patch in simple cases, 
                      // but here we keep it for consistency if needed in future
        inn: currentItem.inn,
        kpp: currentItem.kpp,
        ogrn: currentItem.ogrn,
        external_code: currentItem.external_code,
        address: currentItem.address,
        is_active: currentItem.is_active,
      })
    } else if (open) {
      form.reset({
        name: "",
        full_name: "",
        unit_type: "",
        business_role: "",
        is_legal_entity: false,
        country: null,
        parent: parentId,
        inn: "",
        kpp: "",
        ogrn: "",
        external_code: "",
        address: "",
        is_active: true,
      })
    }
  }, [currentItem, form, open, parentId])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (currentItem) {
        // Simple update (not changing parent for now as it requires treebeard move ops)
        await updateMutation.mutateAsync({ id: currentItem.id, data: values as Partial<OrgUnit> })
        toast.success("Организация обновлена")
      } else {
        const payload: Record<string, unknown> = { ...values }
        // If it's root level, ensure parent is null
        if (isRootLevel) {
          payload.parent = null
        }
        await createMutation.mutateAsync(payload as Partial<OrgUnit> & { parent?: number })
        toast.success("Организация создана")
      }
      onOpenChange(false)
    } catch {
      toast.error("Ошибка при сохранении")
    }
  })

  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={currentItem ? "Редактирование организации" : "Создание организации"}
    >
      {isFetching ? (
        <div className="space-y-4 py-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="unit_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип подразделения</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(UNIT_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isRootLevel && unitType && (
              <FormField
                control={form.control}
                name="parent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Родительская организация</FormLabel>
                    <FormControl>
                      <OrgUnitCombobox
                        mode="single"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      {parentFilterText}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="business_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Бизнес-роль</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BUSINESS_ROLES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Страна</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                    value={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите страну" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countriesData?.results.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="inn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ИНН</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kpp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>КПП</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ogrn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ОГРН</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="external_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Внешний код</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Адрес</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                </FormItem>
              )}
            />
            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_legal_entity"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Юр. лицо</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Активна</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </EntityFormDialog>
  )
}
