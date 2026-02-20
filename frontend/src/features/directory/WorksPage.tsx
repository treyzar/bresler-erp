import type { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"
import type { TypeOfWork } from "@/api/types"
import { worksHooks } from "@/api/hooks/useWorks"
import { ReferenceTablePage, type FormFieldConfig } from "./shared/ReferenceTablePage"

const columns: ColumnDef<TypeOfWork, unknown>[] = [
  { accessorKey: "id", header: "ID", size: 80 },
  { accessorKey: "name", header: "Название" },
]

const formSchema = z.object({ name: z.string().min(1, "Обязательное поле") })
const formFields: FormFieldConfig[] = [{ name: "name", label: "Название" }]

export function WorksPage() {
  return (
    <ReferenceTablePage<TypeOfWork>
      title="Виды работ"
      columns={columns}
      formSchema={formSchema}
      formFields={formFields}
      queryHooks={worksHooks}
      defaultValues={{ name: "" }}
    />
  )
}
