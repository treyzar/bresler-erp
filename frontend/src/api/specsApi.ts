import apiClient from "./client"
import type {
  CommercialOfferDetail,
  CommercialOfferListItem,
  OfferCalculation,
  OfferWorkItem,
  OfferSpecification,
  ParticipantContact,
  PaginatedResponse,
} from "./types"

export const specsApi = {
  // Offers
  listOffers: async (orderId: number, params?: Record<string, unknown>) => {
    const { data } = await apiClient.get<PaginatedResponse<CommercialOfferListItem>>(
      `/orders/${orderId}/offers/`, { params },
    )
    return data
  },

  getOffer: async (offerId: number) => {
    const { data } = await apiClient.get<CommercialOfferDetail>(`/offers/${offerId}/`)
    return data
  },

  createOffer: async (orderId: number, payload: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/orders/${orderId}/offers/`, payload)
    return data
  },

  updateOffer: async (offerId: number, payload: Record<string, unknown>) => {
    const { data } = await apiClient.patch<CommercialOfferDetail>(`/offers/${offerId}/`, payload)
    return data
  },

  deleteOffer: async (offerId: number) => {
    await apiClient.delete(`/offers/${offerId}/`)
  },

  copyOffer: async (offerId: number, participantId: number) => {
    const { data } = await apiClient.post<CommercialOfferDetail>(
      `/offers/${offerId}/copy/`, { participant_id: participantId },
    )
    return data
  },

  exportOffer: async (offerId: number) => {
    const { data, headers } = await apiClient.get(`/offers/${offerId}/export/`, {
      responseType: "blob",
    })
    const filename = headers["content-disposition"]?.match(/filename="?(.+?)"?$/)?.[1] ?? `offer_${offerId}.docx`
    const url = URL.createObjectURL(data)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },

  // Specification
  getSpecification: async (offerId: number) => {
    const { data } = await apiClient.get<OfferSpecification>(
      `/offers/${offerId}/specification/`,
    )
    return data
  },

  updateSpecification: async (offerId: number, lines: unknown[]) => {
    const { data } = await apiClient.patch<OfferSpecification>(
      `/offers/${offerId}/specification/`, { lines },
    )
    return data
  },

  fillSpecification: async (offerId: number, payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<OfferSpecification>(
      `/offers/${offerId}/specification/fill/`, payload,
    )
    return data
  },

  exportSpecification: async (offerId: number) => {
    const { data, headers } = await apiClient.get(`/offers/${offerId}/specification/export/`, {
      responseType: "blob",
    })
    const filename = headers["content-disposition"]?.match(/filename="?(.+?)"?$/)?.[1] ?? `spec_${offerId}.docx`
    const url = URL.createObjectURL(data)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },

  // Work items
  getWorkItems: async (offerId: number) => {
    const { data } = await apiClient.get<OfferWorkItem[]>(`/offers/${offerId}/works/`)
    return data
  },

  updateWorkItems: async (offerId: number, items: Partial<OfferWorkItem>[]) => {
    const { data } = await apiClient.patch<OfferWorkItem[]>(
      `/offers/${offerId}/works/`, items,
    )
    return data
  },

  // Participant contacts
  listParticipantContacts: async (participantId: number) => {
    const { data } = await apiClient.get<PaginatedResponse<ParticipantContact>>(
      `/participants/${participantId}/contacts/`,
    )
    return data
  },

  addParticipantContact: async (participantId: number, contactId: number, isPrimary = false) => {
    const { data } = await apiClient.post<ParticipantContact>(
      `/participants/${participantId}/contacts/`,
      { participant: participantId, contact: contactId, is_primary: isPrimary },
    )
    return data
  },

  removeParticipantContact: async (participantId: number, contactLinkId: number) => {
    await apiClient.delete(`/participants/${participantId}/contacts/${contactLinkId}/`)
  },

  // Calculation
  getCalculation: async (offerId: number) => {
    const { data } = await apiClient.get<OfferCalculation>(`/offers/${offerId}/calculation/`)
    return data
  },

  updateCalculation: async (offerId: number, payload: Record<string, unknown>) => {
    const { data } = await apiClient.patch<OfferCalculation>(`/offers/${offerId}/calculation/`, payload)
    return data
  },

  applyCalcDefaults: async (offerId: number) => {
    const { data } = await apiClient.post<OfferCalculation>(`/offers/${offerId}/calculation/apply-defaults/`)
    return data
  },

  addCalcParameters: async (offerId: number, payload: {
    device_rza_id?: number; mod_rza_id?: number; parent_line_id?: number; pricing_mode?: string
  }) => {
    const { data } = await apiClient.post<OfferCalculation>(
      `/offers/${offerId}/calculation/add-parameters/`, payload,
    )
    return data
  },

  calcToSpecification: async (offerId: number) => {
    const { data } = await apiClient.post<OfferSpecification>(`/offers/${offerId}/calculation/to-specification/`)
    return data
  },
}
