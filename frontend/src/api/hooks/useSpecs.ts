import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { specsApi } from "../specsApi"

// ── Offers ───────────────────────────────────────────────────────

export function useOfferList(orderId: number) {
  return useQuery({
    queryKey: ["offers", orderId],
    queryFn: () => specsApi.listOffers(orderId),
    enabled: !!orderId,
  })
}

export function useOffer(offerId: number | null) {
  return useQuery({
    queryKey: ["offer", offerId],
    queryFn: () => specsApi.getOffer(offerId!),
    enabled: !!offerId,
  })
}

export function useCreateOffer(orderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => specsApi.createOffer(orderId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers", orderId] })
    },
  })
}

export function useUpdateOffer(offerId: number, orderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => specsApi.updateOffer(offerId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offer", offerId] })
      qc.invalidateQueries({ queryKey: ["offers", orderId] })
    },
  })
}

export function useDeleteOffer(orderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (offerId: number) => specsApi.deleteOffer(offerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers", orderId] })
    },
  })
}

export function useCopyOffer(orderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ offerId, participantId }: { offerId: number; participantId: number }) =>
      specsApi.copyOffer(offerId, participantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers", orderId] })
    },
  })
}

// ── Specification ────────────────────────────────────────────────

export function useSpecification(offerId: number | null) {
  return useQuery({
    queryKey: ["specification", offerId],
    queryFn: () => specsApi.getSpecification(offerId!),
    enabled: !!offerId,
  })
}

export function useUpdateSpecification(offerId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lines: unknown[]) => specsApi.updateSpecification(offerId, lines),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specification", offerId] })
      qc.invalidateQueries({ queryKey: ["offer", offerId] })
    },
  })
}

// ── Work Items ───────────────────────────────────────────────────

export function useWorkItems(offerId: number | null) {
  return useQuery({
    queryKey: ["workItems", offerId],
    queryFn: () => specsApi.getWorkItems(offerId!),
    enabled: !!offerId,
  })
}

export function useUpdateWorkItems(offerId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: Record<string, unknown>[]) => specsApi.updateWorkItems(offerId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workItems", offerId] })
    },
  })
}

export function useFillSpecification(offerId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => specsApi.fillSpecification(offerId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specification", offerId] })
      qc.invalidateQueries({ queryKey: ["offer", offerId] })
    },
  })
}

// ── Participant Contacts ────────────────────────────────────────

export function useParticipantContacts(participantId: number | null) {
  return useQuery({
    queryKey: ["participantContacts", participantId],
    queryFn: () => specsApi.listParticipantContacts(participantId!),
    enabled: !!participantId,
  })
}

export function useAddParticipantContact(participantId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contactId, isPrimary }: { contactId: number; isPrimary?: boolean }) =>
      specsApi.addParticipantContact(participantId, contactId, isPrimary),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["participantContacts", participantId] })
    },
  })
}

export function useRemoveParticipantContact(participantId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contactLinkId: number) =>
      specsApi.removeParticipantContact(participantId, contactLinkId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["participantContacts", participantId] })
    },
  })
}
