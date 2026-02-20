import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { EntityFormDialog } from "@/components/shared/EntityFormDialog"
import type { OrgUnit } from "@/api/types"
import { orgUnitHooks, useOrgUnitCreate } from "@/api/hooks/useOrgUnits"
import { countryHooks } from "@/api/hooks/useCountries"
import { UNIT_TYPES, BUSINESS_ROLES } from "@/lib/constants"

const formSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  full_name: z.string().optional().default(""),
  unit_type: z.string().min(1, "Обязательное поле"),
  business_role: z.string().min(1, "Обязательное поле"),
  is_legal_entity: z.boolean().default(false),
  country: z.coerce.number().nullable().default(null),
  inn: z.string().optional().default(""),
  kpp: z.string().optional().default(""),
  ogrn: z.string().optional().default(""),
  external_code: z.string().optional().default(""),
  address: z.string().optional().default(""),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface OrgUnitFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem: OrgUnit | null
  parentId: number | null
}

export function OrgUnitForm({ open, onOpenChange, editingItem, parentId }: OrgUnitFormProps) {
  const createMutation = useOrgUnitCreate()
  const updateMutation = orgUnitHooks.useUpdate()
  const { data: countriesData } = countryHooks.useList({ page_size: 200 })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: editingItem
      ? {
          name: editingItem.name,
          full_name: editingItem.full_name,
          unit_type: editingItem.unit_type,
          business_role: editingItem.business_role,
          is_legal_entity: editingItem.is_legal_entity,
          country: editingItem.country,
          inn: editingItem.inn,
          kpp: editingItem.kpp,
          ogrn: editingItem.ogrn,
          external_code: editingItem.external_code,
          address: editingItem.address,
          is_active: editingItem.is_active,
        }
      : {
          name: "",
          full_name: "",
          unit_type: "",
          business_role: "",
          is_legal_entity: false,
          country: null,
          inn: "",
          kpp: "",
          ogrn: "",
          external_code: "",
          address: "",
          is_active: true,
        },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: values as Partial<OrgUnit> })
        toast.success("Организация обновлена")
      } else {
        const payload: Record<string, unknown> = { ...values }
        if (parentId) payload.parent = parentId
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
      title={editingItem ? "Редактирование организации" : "Создание организации"}
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="unit_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип</FormLabel>
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
    </EntityFormDialog>
  )
}
