import type { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"
import type { VoltageClass } from "@/api/types"
import { voltageClassHooks } from "@/api/hooks/useDevices"
import { ReferenceTablePage, type FormFieldConfig } from "@/features/directory/shared/ReferenceTablePage"

const columns: ColumnDef<VoltageClass, unknown>[] = [
  { accessorKey: "name", header: "Класс напряжения" },
  { accessorKey: "description", header: "Описание" },
]

const formSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  description: z.string().optional().default(""),
})

const formFields: FormFieldConfig[] = [
  { name: "name", label: "Класс напряжения", placeholder: "6–35 кВ" },
  { name: "description", label: "Описание" },
]

export function VoltageClassesPage() {
  return (
    <ReferenceTablePage<VoltageClass>
      title="Классы напряжения"
      columns={columns}
      formSchema={formSchema}
      formFields={formFields}
      queryHooks={voltageClassHooks}
      defaultValues={{ name: "", description: "" }}
    />
  )
}
