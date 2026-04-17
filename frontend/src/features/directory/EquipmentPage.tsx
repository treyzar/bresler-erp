import type { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"
import type { Equipment } from "@/api/types"
import { equipmentHooks } from "@/api/hooks/useEquipment"
import { ReferenceTablePage, type FormFieldConfig } from "./shared/ReferenceTablePage"

const columns: ColumnDef<Equipment, unknown>[] = [
  { accessorKey: "name", header: "Название" },
]

const formSchema = z.object({ name: z.string().min(1, "Обязательное поле") })
const formFields: FormFieldConfig[] = [{ name: "name", label: "Название" }]

export function EquipmentPage() {
  return (
    <ReferenceTablePage<Equipment>
      title="Оборудование"
      columns={columns}
      formSchema={formSchema}
      formFields={formFields}
      queryHooks={equipmentHooks}
      defaultValues={{ name: "" }}
    />
  )
}
