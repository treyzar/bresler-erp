import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import type { OrgUnit, ListParams, PaginatedResponse } from "../types"
import { orgUnitsApi } from "../directoryApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"

export const orgUnitHooks = createDirectoryQueryHooks<OrgUnit>("orgunits", orgUnitsApi)

export function useOrgUnitChildren(parentId: number | null) {
  return useQuery<OrgUnit[]>({
    queryKey: ["orgunits", "children", parentId],
    queryFn: () => orgUnitsApi.children(parentId!),
    enabled: parentId !== null,
  })
}

export function useOrgUnitAncestors(nodeId: number | null) {
  return useQuery<OrgUnit[]>({
    queryKey: ["orgunits", "ancestors", nodeId],
    queryFn: () => orgUnitsApi.ancestors(nodeId!),
    enabled: nodeId !== null,
  })
}

export function useOrgUnitSearch(query: string) {
  return useQuery<OrgUnit[]>({
    queryKey: ["orgunits", "search", query],
    queryFn: () => orgUnitsApi.search(query),
    enabled: query.length >= 2,
  })
}

export function useOrgUnitTree() {
  return useQuery<import("../types").OrgUnitTreeNode[]>({
    queryKey: ["orgunits", "tree"],
    queryFn: () => orgUnitsApi.tree(),
  })
}

export function useOrgUnitList(params?: ListParams) {
  return useQuery<PaginatedResponse<OrgUnit>>({
    queryKey: ["orgunits", "list", params],
    queryFn: () => orgUnitsApi.list(params),
  })
}

export function useFacilitiesByOrgUnits(ids: number[]) {
  return useQuery<{ id: number; name: string; org_unit_name: string }[]>({
    queryKey: ["orgunits", "facilities-by-orgunits", ids],
    queryFn: () => orgUnitsApi.facilitiesByOrgUnits(ids),
    enabled: ids.length > 0,
  })
}

export function useOrgUnitCreate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<OrgUnit> & { parent?: number }) =>
      orgUnitsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgunits"] })
    },
  })
}
