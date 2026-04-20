import { useQuery } from "@tanstack/react-query"
import apiClient from "@/api/client"

export interface ContactEmployment {
  id: number
  contact: number
  org_unit: number
  org_unit_name: string
  position: string
  address: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  note: string
  created_at: string
  updated_at: string
}

const KEY = "contact-employments"

export function useContactEmployments(contactId: number | null) {
  return useQuery({
    queryKey: [KEY, contactId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: ContactEmployment[] } | ContactEmployment[]>(
        "/directory/contact-employments/",
        { params: { contact: contactId, page_size: 100 } },
      )
      return Array.isArray(data) ? data : data.results
    },
    enabled: contactId !== null,
  })
}
