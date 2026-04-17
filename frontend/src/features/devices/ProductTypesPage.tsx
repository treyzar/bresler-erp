import type { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"
import type { ProductType } from "@/api/types"
import { productTypeHooks } from "@/api/hooks/useDevices"
import { ReferenceTablePage, type FormFieldConfig } from "@/features/directory/shared/ReferenceTablePage"

const columns: ColumnDef<ProductType, unknown>[] = [
  { accessorKey: "name", header: "Тип продукта" },
  { accessorKey: "code", header: "Код", size: 120 },
  { accessorKey: "mark", header: "Обозначение", size: 150 },
]

const formSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  code: z.string().optional().default(""),
  mark: z.string().optional().default(""),
  description: z.string().optional().default(""),
})

const formFields: FormFieldConfig[] = [
  { name: "name", label: "Тип продукта" },
  { name: "code", label: "Код" },
  { name: "mark", label: "Обозначение" },
  { name: "description", label: "Описание", type: "textarea" },
]

export function ProductTypesPage() {
  return (
    <ReferenceTablePage<ProductType>
      title="Типы продуктов"
      columns={columns}
      formSchema={formSchema}
      formFields={formFields}
      queryHooks={productTypeHooks}
      defaultValues={{ name: "", code: "", mark: "", description: "" }}
    />
  )
}
