import apiClient from "./client"
import type { BaseEntity, Facility, ListParams, OrgUnit, OrgUnitTreeNode, PaginatedResponse } from "./types"

export interface DirectoryApi<T extends BaseEntity> {
  list: (params?: ListParams) => Promise<PaginatedResponse<T>>
  get: (id: number) => Promise<T>
  create: (data: Partial<T>) => Promise<T>
  update: (id: number, data: Partial<T>) => Promise<T>
  delete: (id: number) => Promise<void>
  bulkDelete: (ids: number[]) => Promise<{ deleted: number }>
}

export function createDirectoryApi<T extends BaseEntity>(basePath: string): DirectoryApi<T> {
  return {
    list: async (params?: ListParams) => {
      const { data } = await apiClient.get<PaginatedResponse<T>>(basePath, { params })
      return data
    },
    get: async (id: number) => {
      const { data } = await apiClient.get<T>(`${basePath}${id}/`)
      return data
    },
    create: async (payload: Partial<T>) => {
      const { data } = await apiClient.post<T>(basePath, payload)
      return data
    },
    update: async (id: number, payload: Partial<T>) => {
      const { data } = await apiClient.patch<T>(`${basePath}${id}/`, payload)
      return data
    },
    delete: async (id: number) => {
      await apiClient.delete(`${basePath}${id}/`)
    },
    bulkDelete: async (ids: number[]) => {
      const { data } = await apiClient.delete<{ deleted: number }>(`${basePath}bulk-delete/`, {
        data: { ids },
      })
      return data
    },
  }
}

// Entity API instances
export const countriesApi = createDirectoryApi<import("./types").Country>("/directory/countries/")
export const citiesApi = createDirectoryApi<import("./types").City>("/directory/cities/")
export const contactsApi = createDirectoryApi<import("./types").Contact>("/directory/contacts/")
export const equipmentApi = createDirectoryApi<import("./types").Equipment>("/directory/equipment/")
export const worksApi = createDirectoryApi<import("./types").TypeOfWork>("/directory/works/")
export const deliveryTypesApi = createDirectoryApi<import("./types").DeliveryType>("/directory/delivery-types/")
export const facilitiesApi = createDirectoryApi<Facility>("/directory/facilities/")

// OrgUnits API — extended with tree operations
const baseOrgUnitsApi = createDirectoryApi<OrgUnit>("/directory/orgunits/")

export const orgUnitsApi = {
  ...baseOrgUnitsApi,
  children: async (id: number) => {
    const { data } = await apiClient.get<OrgUnit[]>(`/directory/orgunits/${id}/children/`)
    return data
  },
  ancestors: async (id: number) => {
    const { data } = await apiClient.get<OrgUnit[]>(`/directory/orgunits/${id}/ancestors/`)
    return data
  },
  tree: async () => {
    const { data } = await apiClient.get<OrgUnitTreeNode[]>("/directory/orgunits/tree/")
    return data
  },
  search: async (q: string) => {
    const { data } = await apiClient.get<OrgUnit[]>("/directory/orgunits/search/", { params: { q } })
    return data
  },
}
