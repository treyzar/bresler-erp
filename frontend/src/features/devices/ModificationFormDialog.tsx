import { useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useCreateModRZA, useUpdateModRZA } from "@/api/hooks/useDevices"
import type { ModRZA } from "@/api/types"

const schema = z.object({
  mod_code: z.string().min(1, "Обязательное поле"),
  mod_name: z.string().optional().default(""),
  alter_mod_code: z.string().optional().default(""),
  sec_mod_code: z.string().optional().default(""),
})

type FormValues = z.infer<typeof schema>

interface Props {
  deviceId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  modification?: ModRZA | null
}

const EMPTY: FormValues = { mod_code: "", mod_name: "", alter_mod_code: "", sec_mod_code: "" }

export function ModificationFormDialog({ deviceId, open, onOpenChange, modification }: Props) {
  const createMutation = useCreateModRZA()
  const updateMutation = useUpdateModRZA()
  const isEditing = !!modification

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  })

  // Reset form whenever the dialog opens with a different modification
  useEffect(() => {
    if (!open) return
    form.reset(
      modification
        ? {
            mod_code: modification.mod_code,
            mod_name: modification.mod_name || "",
            alter_mod_code: modification.alter_mod_code || "",
            sec_mod_code: modification.sec_mod_code || "",
          }
        : EMPTY,
    )
  }, [open, modification, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEditing && modification) {
        await updateMutation.mutateAsync({ id: modification.id, data: values })
        toast.success("Модификация обновлена")
      } else {
        await createMutation.mutateAsync({ ...values, device_rza: deviceId })
        toast.success("Модификация создана")
      }
      form.reset()
      onOpenChange(false)
    } catch {
      toast.error(isEditing ? "Ошибка при обновлении" : "Ошибка при создании")
    }
  })

  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Редактировать модификацию" : "Новая модификация"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField control={form.control} name="mod_code" render={({ field }) => (
              <FormItem>
                <FormLabel>Код модификации</FormLabel>
                <FormControl><Input placeholder="001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="mod_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Наименование</FormLabel>
                <FormControl><Input placeholder="Базовая конфигурация" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="alter_mod_code" render={({ field }) => (
              <FormItem>
                <FormLabel>Альтернативный код</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sec_mod_code" render={({ field }) => (
              <FormItem>
                <FormLabel>Код по ШЭТ</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
              <Button type="submit" disabled={submitting}>
                {isEditing ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
