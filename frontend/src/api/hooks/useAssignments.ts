import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  assignmentsApi,
  type AssignmentInput,
  type AssignmentListParams,
} from "../usersApi"
import type { Assignment } from "../types"

const KEY = "assignments"

export function useAssignmentList(params?: AssignmentListParams) {
  return useQuery({
    queryKey: [KEY, "list", params],
    queryFn: () => assignmentsApi.list(params),
  })
}

export function useAssignment(id: number | null) {
  return useQuery({
    queryKey: [KEY, "detail", id],
    queryFn: () => assignmentsApi.retrieve(id!),
    enabled: id !== null,
  })
}

export function useCreateAssignment() {
  const qc = useQueryClient()
  return useMutation<Assignment, Error, AssignmentInput>({
    mutationFn: (data) => assignmentsApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      // Профиль пользователя содержит assignments — пере-фетчим.
      qc.invalidateQueries({ queryKey: ["users"] })
      if (vars.user) qc.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}

export function useUpdateAssignment() {
  const qc = useQueryClient()
  return useMutation<Assignment, Error, { id: number; data: AssignmentInput }>({
    mutationFn: ({ id, data }) => assignmentsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ["users"] })
      qc.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}

export function useDeleteAssignment() {
  const qc = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: (id) => assignmentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ["users"] })
      qc.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}
