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
import { useCreateModRZA } from "@/api/hooks/useDevices"

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
}

export function ModificationFormDialog({ deviceId, open, onOpenChange }: Props) {
  const createMutation = useCreateModRZA()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mod_code: "", mod_name: "", alter_mod_code: "", sec_mod_code: "" },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({ ...values, device_rza: deviceId })
      toast.success("Модификация создана")
      form.reset()
      onOpenChange(false)
    } catch {
      toast.error("Ошибка при создании")
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая модификация</DialogTitle>
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
              <Button type="submit" disabled={createMutation.isPending}>Создать</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
