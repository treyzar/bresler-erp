import type { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"
import type { Designer } from "@/api/types"
import { designerHooks } from "@/api/hooks/useDesigners"
import { ReferenceTablePage, type FormFieldConfig } from "./shared/ReferenceTablePage"

const columns: ColumnDef<Designer, unknown>[] = [
  { accessorKey: "id", header: "ID", size: 80 },
  { accessorKey: "name", header: "Название" },
]

const formSchema = z.object({ name: z.string().min(1, "Обязательное поле") })
const formFields: FormFieldConfig[] = [{ name: "name", label: "Название" }]

export function DesignersPage() {
  return (
    <ReferenceTablePage<Designer>
      title="Проектанты"
      columns={columns}
      formSchema={formSchema}
      formFields={formFields}
      queryHooks={designerHooks}
      defaultValues={{ name: "" }}
    />
  )
}
