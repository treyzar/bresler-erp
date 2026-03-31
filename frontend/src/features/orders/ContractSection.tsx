import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import type { Contract } from "@/api/types"
import { CONTRACT_STATUSES } from "@/api/types"
import { useUpdateContract } from "@/api/hooks/useOrders"

const contractSchema = z.object({
  contract_number: z.string(),
  contract_date: z.string(),
  status: z.string(),
  advance_percent: z.string(),
  intermediate_percent: z.string(),
  post_payment_percent: z.string(),
  amount: z.string(),
  deadline_days: z.number().int().nonnegative().nullable(),
})

type ContractValues = z.infer<typeof contractSchema>

interface ContractSectionProps {
  orderId: number
  contract: Contract | null
}

export function ContractSection({ orderId, contract }: ContractSectionProps) {
  const updateMutation = useUpdateContract()

  const form = useForm<ContractValues>({
    resolver: zodResolver(contractSchema),
    values: contract
      ? {
          contract_number: contract.contract_number,
          contract_date: contract.contract_date ?? "",
          status: contract.status,
          advance_percent: contract.advance_percent,
          intermediate_percent: contract.intermediate_percent,
          post_payment_percent: contract.post_payment_percent,
          amount: contract.amount ?? "",
          deadline_days: contract.deadline_days,
        }
      : {
          contract_number: "",
          contract_date: "",
          status: "not_paid",
          advance_percent: "0.00",
          intermediate_percent: "0.00",
          post_payment_percent: "0.00",
          amount: "",
          deadline_days: null,
        },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({
        orderId,
        data: {
          ...values,
          contract_date: values.contract_date || null,
          amount: values.amount || null,
        } as Partial<Contract>,
      })
      toast.success(contract ? "Контракт обновлён" : "Контракт создан")
    } catch {
      toast.error("Ошибка при сохранении контракта")
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contract ? "Контракт" : "Создать контракт"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contract_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер контракта</FormLabel>
                    <FormControl>
                      <Input placeholder="Автоматически, если оставить пустым" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contract_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата контракта</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус оплаты</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CONTRACT_STATUSES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="advance_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Аванс, %</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="intermediate_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Промежуточная, %</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="post_payment_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Постоплата, %</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Срок, дней</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
