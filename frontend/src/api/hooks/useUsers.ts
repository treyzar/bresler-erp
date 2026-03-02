import { useQuery } from "@tanstack/react-query"
import { usersApi } from "../usersApi"
import type { ListParams } from "../types"

export function useUserList(params?: ListParams) {
  return useQuery({
    queryKey: ["users", "list", params],
    queryFn: () => usersApi.list(params),
  })
}
