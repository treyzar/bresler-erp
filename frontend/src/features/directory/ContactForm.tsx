import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { EntityFormDialog } from "@/components/shared/EntityFormDialog"
import { OrgUnitCombobox } from "@/components/shared/OrgUnitCombobox"
import type { Contact } from "@/api/types"
import { contactHooks } from "@/api/hooks/useContacts"

const formSchema = z.object({
  full_name: z.string().min(1, "Обязательное поле"),
  position: z.string(),
  email: z.string().email("Некорректный email").or(z.literal("")),
  phone: z.string(),
  company: z.string(),
  address: z.string(),
  org_units: z.array(z.number()),
})

type FormValues = z.infer<typeof formSchema>

interface ContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem: Contact | null
}

export function ContactForm({ open, onOpenChange, editingItem }: ContactFormProps) {
  const createMutation = contactHooks.useCreate()
  const updateMutation = contactHooks.useUpdate()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: editingItem
      ? {
          full_name: editingItem.full_name,
          position: editingItem.position,
          email: editingItem.email,
          phone: editingItem.phone,
          company: editingItem.company,
          address: editingItem.address,
          org_units: editingItem.org_units,
        }
      : {
          full_name: "",
          position: "",
          email: "",
          phone: "",
          company: "",
          address: "",
          org_units: [],
        },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: values as Partial<Contact> })
        toast.success("Контакт обновлён")
      } else {
        await createMutation.mutateAsync(values as Partial<Contact>)
        toast.success("Контакт создан")
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
      title={editingItem ? "Редактирование контакта" : "Создание контакта"}
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ФИО</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Должность</FormLabel>
                <FormControl><Input {...field} /></FormControl>
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Телефон</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Компания</FormLabel>
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
          <FormField
            control={form.control}
            name="org_units"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Организация</FormLabel>
                <FormControl>
                  <OrgUnitCombobox
                    mode="single"
                    value={field.value[0] ?? null}
                    onChange={(id) => field.onChange(id ? [id] : [])}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Текущий работодатель. История мест работы ведётся отдельно.
                </p>
              </FormItem>
            )}
          />
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
