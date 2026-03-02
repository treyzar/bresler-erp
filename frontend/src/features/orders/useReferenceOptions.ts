import { useOrgUnitList } from "@/api/hooks/useOrgUnits"
import { countryHooks } from "@/api/hooks/useCountries"
import { equipmentHooks } from "@/api/hooks/useEquipment"
import { worksHooks } from "@/api/hooks/useWorks"
import { contactHooks } from "@/api/hooks/useContacts"
import { useUserList } from "@/api/hooks/useUsers"

export function useReferenceOptions() {
  const { data: intermediariesData } = useOrgUnitList({ page_size: 200, business_role: "partner", is_active: true })
  const { data: designersData } = useOrgUnitList({ page_size: 200, business_role: "designer", is_active: true })
  const { data: countriesData } = countryHooks.useList({ page_size: 200 })
  const { data: equipmentData } = equipmentHooks.useList({ page_size: 200 })
  const { data: worksData } = worksHooks.useList({ page_size: 200 })
  const { data: contactsData } = contactHooks.useList({ page_size: 200 })
  const { data: usersData } = useUserList({ page_size: 200 })

  return {
    intermediaries: intermediariesData?.results ?? [],
    designers: designersData?.results ?? [],
    countries: countriesData?.results ?? [],
    equipments: equipmentData?.results ?? [],
    works: worksData?.results ?? [],
    contacts: contactsData?.results ?? [],
    users: usersData?.results ?? [],
  }
}
