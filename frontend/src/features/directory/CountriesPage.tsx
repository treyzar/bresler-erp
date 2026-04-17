import type { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"
import type { Country } from "@/api/types"
import { countryHooks } from "@/api/hooks/useCountries"
import { ReferenceTablePage, type FormFieldConfig } from "./shared/ReferenceTablePage"

const columns: ColumnDef<Country, unknown>[] = [
  { accessorKey: "name", header: "Название" },
  { accessorKey: "code", header: "Код ISO", size: 120 },
]

const formSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  code: z.string().min(1, "Обязательное поле").max(3, "Максимум 3 символа"),
})

const formFields: FormFieldConfig[] = [
  { name: "name", label: "Название" },
  { name: "code", label: "Код ISO", placeholder: "RU" },
]

export function CountriesPage() {
  return (
    <ReferenceTablePage<Country>
      title="Страны"
      columns={columns}
      formSchema={formSchema}
      formFields={formFields}
      queryHooks={countryHooks}
      defaultValues={{ name: "", code: "" }}
    />
  )
}
