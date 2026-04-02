import { useQuery } from "@tanstack/react-query"
import apiClient from "../client"

export interface FilterChoice {
  value: string
  label: string
}

export interface FilterMeta {
  name: string
  type: "text" | "number" | "boolean" | "date" | "datetime" | "choice" | "foreign_key" | "many_to_many"
  label: string
  lookup: string
  field_name: string
  required: boolean
  choices?: FilterChoice[]
  widget?: "combobox" | "text" | "date"
  endpoint?: string
  range_group?: string
  custom_method?: boolean
}

export interface SearchFieldMeta {
  field: string
  label: string
}

export interface OrderingFieldMeta {
  field: string
  label: string
}

export interface ViewSetMeta {
  model: string | null
  model_verbose: string | null
  model_verbose_plural: string | null
  filters: FilterMeta[]
  search_fields: SearchFieldMeta[]
  ordering_fields: OrderingFieldMeta[]
}

export function useFilterMeta(endpoint: string) {
  return useQuery({
    queryKey: ["meta", endpoint],
    queryFn: async () => {
      const { data } = await apiClient.get<ViewSetMeta>(`${endpoint}meta/`)
      return data
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 min — metadata rarely changes
  })
}
