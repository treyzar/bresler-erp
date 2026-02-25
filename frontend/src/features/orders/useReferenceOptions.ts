import { useOrgUnitList } from "@/api/hooks/useOrgUnits"
import { countryHooks } from "@/api/hooks/useCountries"

export function useReferenceOptions() {
  const { data: intermediariesData } = useOrgUnitList({ page_size: 200, business_role: "partner", is_active: true })
  const { data: designersData } = useOrgUnitList({ page_size: 200, business_role: "designer", is_active: true })
  const { data: countriesData } = countryHooks.useList({ page_size: 200 })

  return {
    intermediaries: intermediariesData?.results ?? [],
    designers: designersData?.results ?? [],
    countries: countriesData?.results ?? [],
  }
}
