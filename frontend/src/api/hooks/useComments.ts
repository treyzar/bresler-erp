import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { commentsApi } from "../commentsApi"

const KEY = "comments"

export function useComments(targetModel: string, targetId: number | null) {
  return useQuery({
    queryKey: [KEY, targetModel, targetId],
    queryFn: () => commentsApi.list(targetModel, targetId!),
    enabled: targetId !== null,
  })
}

export function useCreateComment(targetModel: string, targetId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      commentsApi.create({ text, target_model: targetModel, target_id: targetId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, targetModel, targetId] })
    },
  })
}

export function useDeleteComment(targetModel: string, targetId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => commentsApi.delete(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, targetModel, targetId] })
    },
  })
}
