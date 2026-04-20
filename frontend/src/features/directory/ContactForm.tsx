import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useContactEmployments } from "@/api/hooks/useContactEmployments"

const formSchema = z.object({
  full_name: z.string().min(1, "Обязательное поле"),
  position: z.string(),
  email: z.string().email("Некорректный email").or(z.literal("")),
  phone: z.string(),
  address: z.string(),
  org_unit: z.number().nullable(),
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
  const qc = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: editingItem
      ? {
          full_name: editingItem.full_name,
          position: editingItem.position,
          email: editingItem.email,
          phone: editingItem.phone,
          address: editingItem.address,
          org_unit: editingItem.org_unit,
        }
      : {
          full_name: "",
          position: "",
          email: "",
          phone: "",
          address: "",
          org_unit: null,
        },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: values as Partial<Contact> })
        qc.invalidateQueries({ queryKey: ["contact-employments", editingItem.id] })
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

  const contactFormContent = (
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
          name="org_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Организация</FormLabel>
              <FormControl>
                <OrgUnitCombobox
                  mode="single"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Текущий работодатель. Изменения должности, адреса или организации автоматически
                попадут в историю мест работы.
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
  )

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingItem ? "Редактирование контакта" : "Создание контакта"}
    >
      {editingItem ? (
        <Tabs defaultValue="contact">
          <TabsList>
            <TabsTrigger value="contact">Контакт</TabsTrigger>
            <TabsTrigger value="history">История мест работы</TabsTrigger>
          </TabsList>
          <TabsContent value="contact">{contactFormContent}</TabsContent>
          <TabsContent value="history">
            <EmploymentHistoryView contactId={editingItem.id} />
          </TabsContent>
        </Tabs>
      ) : (
        contactFormContent
      )}
    </EntityFormDialog>
  )
}

function EmploymentHistoryView({ contactId }: { contactId: number }) {
  const { data: employments = [], isLoading } = useContactEmployments(contactId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка…</p>
  }

  if (employments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Записей нет. История пополняется автоматически при изменении должности, адреса или
        организации.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        История ведётся автоматически при изменении должности, адреса или организации контакта.
      </p>
      {employments.map((e) => (
        <div key={e.id} className="rounded border p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{e.org_unit_name}</span>
            {e.is_current && <Badge variant="default" className="text-[10px]">текущая</Badge>}
          </div>
          {e.position && (
            <div className="mt-1 text-xs">
              <span className="text-muted-foreground">Должность: </span>
              {e.position}
            </div>
          )}
          {e.address && (
            <div className="mt-0.5 text-xs">
              <span className="text-muted-foreground">Адрес: </span>
              {e.address}
            </div>
          )}
          <div className="mt-1 text-[10px] text-muted-foreground">
            {e.start_date ?? "—"} — {e.end_date ?? "по н.в."}
          </div>
        </div>
      ))}
    </div>
  )
}
