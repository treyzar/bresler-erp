import apiClient from "./client"
import { createDirectoryApi } from "./directoryApi"
import type {
  BaseEntity,
  ComponentType,
  DeviceComponent,
  DeviceRZA,
  DeviceRZAComponent,
  DeviceRZAParameter,
  ListParams,
  ModRZA,
  ModRZAComponent,
  ModRZAParameter,
  PaginatedResponse,
  Parameter,
  ParameterValue,
  Product,
  ProductAttribute,
  ProductCategory,
  ProductCategoryTree,
  ProductType,
  VoltageClass,
} from "./types"

// ── Simple CRUD APIs ────────────────────────────────────────────────

export const voltageClassesApi = createDirectoryApi<VoltageClass>("/devices/voltage-classes/")
export const componentTypesApi = createDirectoryApi<ComponentType>("/devices/component-types/")
export const productTypesApi = createDirectoryApi<ProductType>("/devices/product-types/")
export const productAttributesApi = createDirectoryApi<ProductAttribute>("/devices/product-attributes/")

// ── DeviceRZA API ───────────────────────────────────────────────────

const baseDeviceRZAApi = createDirectoryApi<DeviceRZA>("/devices/rza/")

export const deviceRZAApi = {
  ...baseDeviceRZAApi,

  modifications: async (deviceId: number, params?: ListParams) => {
    const { data } = await apiClient.get<PaginatedResponse<ModRZA>>(
      `/devices/rza/${deviceId}/modifications/`,
      { params },
    )
    return data
  },

  parameters: async (deviceId: number) => {
    const { data } = await apiClient.get<DeviceRZAParameter[]>(
      `/devices/rza/${deviceId}/parameters/`,
    )
    return data
  },

  availableParameters: async (deviceId: number) => {
    const { data } = await apiClient.get<Parameter[]>(
      `/devices/rza/${deviceId}/parameters/available/`,
    )
    return data
  },

  addParameter: async (deviceId: number, parameterId: number, price: number = 0) => {
    const { data } = await apiClient.post<DeviceRZAParameter>(
      `/devices/rza/${deviceId}/parameters/add/`,
      { parameter_id: parameterId, price },
    )
    return data
  },

  removeParameter: async (deviceId: number, parameterId: number) => {
    await apiClient.post(`/devices/rza/${deviceId}/parameters/${parameterId}/remove/`)
  },

  components: async (deviceId: number) => {
    const { data } = await apiClient.get<DeviceRZAComponent[]>(
      `/devices/rza/${deviceId}/components/`,
    )
    return data
  },

  availableComponents: async (deviceId: number) => {
    const { data } = await apiClient.get<DeviceComponent[]>(
      `/devices/rza/${deviceId}/components/available/`,
    )
    return data
  },

  addComponent: async (deviceId: number, componentId: number, price: number = 0) => {
    const { data } = await apiClient.post<DeviceRZAComponent>(
      `/devices/rza/${deviceId}/components/add/`,
      { component_id: componentId, price },
    )
    return data
  },

  removeComponent: async (deviceId: number, componentId: number) => {
    await apiClient.post(`/devices/rza/${deviceId}/components/${componentId}/remove/`)
  },
}

// ── ModRZA API ──────────────────────────────────────────────────────

const baseModRZAApi = createDirectoryApi<ModRZA>("/devices/modifications/")

export const modRZAApi = {
  ...baseModRZAApi,

  parameters: async (modId: number) => {
    const { data } = await apiClient.get<ModRZAParameter[]>(
      `/devices/modifications/${modId}/parameters/`,
    )
    return data
  },

  addParameter: async (modId: number, parameterId: number, price: number = 0) => {
    const { data } = await apiClient.post<ModRZAParameter>(
      `/devices/modifications/${modId}/parameters/add/`,
      { parameter_id: parameterId, price },
    )
    return data
  },

  removeParameter: async (modId: number, parameterId: number) => {
    await apiClient.post(`/devices/modifications/${modId}/parameters/${parameterId}/remove/`)
  },

  components: async (modId: number) => {
    const { data } = await apiClient.get<ModRZAComponent[]>(
      `/devices/modifications/${modId}/components/`,
    )
    return data
  },

  addComponent: async (modId: number, componentId: number, price: number = 0) => {
    const { data } = await apiClient.post<ModRZAComponent>(
      `/devices/modifications/${modId}/components/add/`,
      { component_id: componentId, price },
    )
    return data
  },

  removeComponent: async (modId: number, componentId: number) => {
    await apiClient.post(`/devices/modifications/${modId}/components/${componentId}/remove/`)
  },
}

// ── Parameter API ───────────────────────────────────────────────────

export const parametersApi = {
  list: async (params?: ListParams) => {
    const { data } = await apiClient.get<PaginatedResponse<Parameter>>(
      "/devices/parameters/",
      { params },
    )
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<Parameter>(`/devices/parameters/${id}/`)
    return data
  },

  tree: async () => {
    const { data } = await apiClient.get<Parameter[]>("/devices/parameters/tree/")
    return data
  },

  children: async (id: number) => {
    const { data } = await apiClient.get<Parameter[]>(`/devices/parameters/${id}/children/`)
    return data
  },

  create: async (payload: Partial<Parameter>) => {
    const { data } = await apiClient.post<Parameter>("/devices/parameters/", payload)
    return data
  },

  update: async (id: number, payload: Partial<Parameter>) => {
    const { data } = await apiClient.patch<Parameter>(`/devices/parameters/${id}/`, payload)
    return data
  },

  delete: async (id: number) => {
    await apiClient.delete(`/devices/parameters/${id}/`)
  },

  addRoot: async (payload: Partial<Parameter>) => {
    const { data } = await apiClient.post<Parameter>("/devices/parameters/add-root/", payload)
    return data
  },

  addChild: async (parentId: number, payload: Partial<Parameter>) => {
    const { data } = await apiClient.post<Parameter>(
      `/devices/parameters/${parentId}/add-child/`,
      payload,
    )
    return data
  },
}

// ── Parameter Values API ────────────────────────────────────────────

export const parameterValuesApi = {
  list: async (params?: ListParams) => {
    const { data } = await apiClient.get<PaginatedResponse<ParameterValue>>(
      "/devices/parameter-values/",
      { params },
    )
    return data
  },

  create: async (payload: Partial<ParameterValue>) => {
    const { data } = await apiClient.post<ParameterValue>("/devices/parameter-values/", payload)
    return data
  },

  update: async (id: number, payload: Partial<ParameterValue>) => {
    const { data } = await apiClient.patch<ParameterValue>(
      `/devices/parameter-values/${id}/`,
      payload,
    )
    return data
  },

  delete: async (id: number) => {
    await apiClient.delete(`/devices/parameter-values/${id}/`)
  },
}

// ── DeviceComponent API ─────────────────────────────────────────────

export const deviceComponentsApi = createDirectoryApi<DeviceComponent>("/devices/components/")

export const deviceComponentsExtApi = {
  triggerImport: async () => {
    const { data } = await apiClient.post<{ task_id: string; status: string }>(
      "/devices/components/trigger-import/",
    )
    return data
  },
}

// ── Product Category API ────────────────────────────────────────────

export const productCategoriesApi = {
  list: async (params?: ListParams) => {
    const { data } = await apiClient.get<PaginatedResponse<ProductCategory>>(
      "/devices/categories/",
      { params },
    )
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<ProductCategory>(`/devices/categories/${id}/`)
    return data
  },

  tree: async () => {
    const { data } = await apiClient.get<ProductCategoryTree[]>("/devices/categories/tree/")
    return data
  },

  children: async (id: number) => {
    const { data } = await apiClient.get<ProductCategory[]>(
      `/devices/categories/${id}/children/`,
    )
    return data
  },

  products: async (id: number, params?: ListParams) => {
    const { data } = await apiClient.get<PaginatedResponse<Product>>(
      `/devices/categories/${id}/products/`,
      { params },
    )
    return data
  },

  create: async (payload: Partial<ProductCategory>) => {
    const { data } = await apiClient.post<ProductCategory>("/devices/categories/", payload)
    return data
  },

  update: async (id: number, payload: Partial<ProductCategory>) => {
    const { data } = await apiClient.patch<ProductCategory>(`/devices/categories/${id}/`, payload)
    return data
  },

  delete: async (id: number) => {
    await apiClient.delete(`/devices/categories/${id}/`)
  },

  addRoot: async (payload: Partial<ProductCategory>) => {
    const { data } = await apiClient.post<ProductCategory>(
      "/devices/categories/add-root/",
      payload,
    )
    return data
  },

  addChild: async (parentId: number, payload: Partial<ProductCategory>) => {
    const { data } = await apiClient.post<ProductCategory>(
      `/devices/categories/${parentId}/add-child/`,
      payload,
    )
    return data
  },
}

// ── Product API ─────────────────────────────────────────────────────

export const productsApi = createDirectoryApi<Product>("/devices/products/")
