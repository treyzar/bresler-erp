import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import {
  useContactEmployments,
  useCreateContactEmployment,
  useDeleteContactEmployment,
} from "@/api/hooks/useContactEmployments"

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

      {editingItem && (
        <>
          <Separator className="my-4" />
          <EmploymentHistorySection contactId={editingItem.id} />
        </>
      )}
    </EntityFormDialog>
  )
}

function EmploymentHistorySection({ contactId }: { contactId: number }) {
  const { data: employments = [] } = useContactEmployments(contactId)
  const createMutation = useCreateContactEmployment()
  const deleteMutation = useDeleteContactEmployment(contactId)

  const [orgUnit, setOrgUnit] = useState<number | null>(null)
  const [position, setPosition] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const handleAdd = async () => {
    if (!orgUnit) {
      toast.error("Выберите организацию")
      return
    }
    try {
      await createMutation.mutateAsync({
        contact: contactId,
        org_unit: orgUnit,
        position,
        start_date: startDate || null,
        end_date: endDate || null,
        is_current: !endDate,
      })
      setOrgUnit(null)
      setPosition("")
      setStartDate("")
      setEndDate("")
      toast.success("Добавлено")
    } catch {
      toast.error("Ошибка")
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">История мест работы</h3>

      {employments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Записей нет</p>
      ) : (
        <div className="space-y-2">
          {employments.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{e.org_unit_name}</span>
                  {e.is_current && <Badge variant="default" className="text-[10px]">текущая</Badge>}
                </div>
                {e.position && <div className="text-xs text-muted-foreground">{e.position}</div>}
                <div className="text-[10px] text-muted-foreground">
                  {e.start_date ?? "—"} — {e.end_date ?? "по н.в."}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(e.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded border p-3 bg-muted/30">
        <p className="text-xs font-medium">Добавить запись</p>
        <OrgUnitCombobox mode="single" value={orgUnit} onChange={setOrgUnit} />
        <Input
          placeholder="Должность"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            placeholder="Начало"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            placeholder="Окончание"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={createMutation.isPending || !orgUnit}
        >
          <Plus className="size-4 mr-1" /> Добавить
        </Button>
      </div>
    </div>
  )
}
