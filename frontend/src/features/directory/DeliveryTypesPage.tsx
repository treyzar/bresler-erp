import type { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"
import type { DeliveryType } from "@/api/types"
import { deliveryTypeHooks } from "@/api/hooks/useDeliveryTypes"
import { ReferenceTablePage, type FormFieldConfig } from "./shared/ReferenceTablePage"

const columns: ColumnDef<DeliveryType, unknown>[] = [
  { accessorKey: "id", header: "ID", size: 80 },
  { accessorKey: "name", header: "Название" },
]

const formSchema = z.object({ name: z.string().min(1, "Обязательное поле") })
const formFields: FormFieldConfig[] = [{ name: "name", label: "Название" }]

export function DeliveryTypesPage() {
  return (
    <ReferenceTablePage<DeliveryType>
      title="Типы доставки"
      columns={columns}
      formSchema={formSchema}
      formFields={formFields}
      queryHooks={deliveryTypeHooks}
      defaultValues={{ name: "" }}
    />
  )
}
