import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { OrderParticipantEntry } from "@/api/types"
import {
  PAYMENT_TERMS, MANUFACTURING_PERIODS,
  WARRANTY_MONTHS_OPTIONS, VALID_DAYS_OPTIONS,
} from "@/api/types"
import { useCreateOffer } from "@/api/hooks/useSpecs"

const schema = z.object({
  participant: z.number({ required_error: "Выберите участника" }),
  date: z.string().min(1, "Укажите дату"),
  valid_days: z.number().min(1),
  vat_rate: z.string(),
  payment_terms: z.string(),
  manufacturing_period: z.string(),
  warranty_months: z.number(),
  delivery_included: z.boolean(),
  delivery_city: z.string(),
  additional_conditions: z.string(),
})

type FormValues = z.infer<typeof schema>

interface OfferFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  participants: OrderParticipantEntry[]
}

export function OfferFormDialog({ open, onOpenChange, orderId, participants }: OfferFormDialogProps) {
  const createMutation = useCreateOffer(orderId)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      participant: participants[0]?.id,
      date: new Date().toISOString().slice(0, 10),
      valid_days: 30,
      vat_rate: "20.00",
      payment_terms: "50_50",
      manufacturing_period: "60-90",
      warranty_months: 60,
      delivery_included: false,
      delivery_city: "",
      additional_conditions: "",
    },
  })

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success("КП создано")
        onOpenChange(false)
        form.reset()
      },
      onError: () => toast.error("Ошибка создания КП"),
    })
  }

  const deliveryIncluded = form.watch("delivery_included")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Создать коммерческое предложение</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Participant */}
          <div className="space-y-1.5">
            <Label>Участник запроса</Label>
            <Select
              value={String(form.watch("participant") ?? "")}
              onValueChange={(v) => form.setValue("participant", Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="Выберите участника" /></SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    #{p.order_index} {p.org_unit_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date + Valid days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Дата КП</Label>
              <Input type="date" {...form.register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label>Срок действия (дней)</Label>
              <Select
                value={String(form.watch("valid_days"))}
                onValueChange={(v) => form.setValue("valid_days", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALID_DAYS_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} дней</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* VAT + Payment terms */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>НДС</Label>
              <Select
                value={form.watch("vat_rate")}
                onValueChange={(v) => form.setValue("vat_rate", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20.00">20%</SelectItem>
                  <SelectItem value="0.00">0%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Условия оплаты</Label>
              <Select
                value={form.watch("payment_terms")}
                onValueChange={(v) => form.setValue("payment_terms", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_TERMS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manufacturing + Warranty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Срок изготовления</Label>
              <Select
                value={form.watch("manufacturing_period")}
                onValueChange={(v) => form.setValue("manufacturing_period", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANUFACTURING_PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>{p} дней</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Гарантия</Label>
              <Select
                value={String(form.watch("warranty_months"))}
                onValueChange={(v) => form.setValue("warranty_months", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WARRANTY_MONTHS_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} мес.</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Delivery */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                checked={deliveryIncluded}
                onCheckedChange={(v) => form.setValue("delivery_included", v)}
              />
              <Label>Доставка включена</Label>
            </div>
            {deliveryIncluded && (
              <Input
                placeholder="Город доставки"
                {...form.register("delivery_city")}
              />
            )}
          </div>

          {/* Additional conditions */}
          <div className="space-y-1.5">
            <Label>Дополнительные условия</Label>
            <Textarea
              placeholder="МЭК, соответствие ТЗ и прочее..."
              rows={3}
              {...form.register("additional_conditions")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Создание..." : "Создать КП"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
