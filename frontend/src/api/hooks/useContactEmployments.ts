import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import apiClient from "@/api/client"

export interface ContactEmployment {
  id: number
  contact: number
  org_unit: number
  org_unit_name: string
  position: string
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

export function useCreateContactEmployment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ContactEmployment>) =>
      apiClient.post<ContactEmployment>("/directory/contact-employments/", data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.contact] })
    },
  })
}

export function useDeleteContactEmployment(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/directory/contact-employments/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, contactId] })
    },
  })
}
