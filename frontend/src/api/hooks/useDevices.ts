import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  deviceRZAApi,
  modRZAApi,
  parametersApi,
  parameterValuesApi,
  deviceComponentsApi,
  deviceComponentsExtApi,
  productCategoriesApi,
  productsApi,
  voltageClassesApi,
  componentTypesApi,
  productTypesApi,
  productAttributesApi,
} from "../devicesApi"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"
import type {
  VoltageClass,
  ComponentType as ComponentTypeModel,
  ProductType,
  ProductAttribute,
  DeviceComponent,
  Product,
  ListParams,
} from "../types"

// ── Simple reference hooks ──────────────────────────────────────────

export const voltageClassHooks = createDirectoryQueryHooks<VoltageClass>(
  "voltage-classes",
  voltageClassesApi,
)
export const componentTypeHooks = createDirectoryQueryHooks<ComponentTypeModel>(
  "component-types",
  componentTypesApi,
)
export const productTypeHooks = createDirectoryQueryHooks<ProductType>(
  "product-types",
  productTypesApi,
)
export const productAttributeHooks = createDirectoryQueryHooks<ProductAttribute>(
  "product-attributes",
  productAttributesApi,
)
export const deviceComponentHooks = createDirectoryQueryHooks<DeviceComponent>(
  "device-components",
  deviceComponentsApi,
)
export const productHooks = createDirectoryQueryHooks<Product>("products", productsApi)

// ── DeviceRZA hooks ─────────────────────────────────────────────────

const RZA_KEY = "device-rza"

export function useDeviceRZAList(params?: ListParams) {
  return useQuery({
    queryKey: [RZA_KEY, "list", params],
    queryFn: () => deviceRZAApi.list(params),
  })
}

export function useDeviceRZA(id: number | null) {
  return useQuery({
    queryKey: [RZA_KEY, "detail", id],
    queryFn: () => deviceRZAApi.get(id!),
    enabled: id !== null,
  })
}

export function useCreateDeviceRZA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => deviceRZAApi.create(data as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RZA_KEY] }),
  })
}

export function useUpdateDeviceRZA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      deviceRZAApi.update(id, data as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RZA_KEY] }),
  })
}

export function useDeleteDeviceRZA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deviceRZAApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RZA_KEY] }),
  })
}

export function useDeviceModifications(deviceId: number | null, params?: ListParams) {
  return useQuery({
    queryKey: [RZA_KEY, "modifications", deviceId, params],
    queryFn: () => deviceRZAApi.modifications(deviceId!, params),
    enabled: deviceId !== null,
  })
}

export function useDeviceParameters(deviceId: number | null) {
  return useQuery({
    queryKey: [RZA_KEY, "parameters", deviceId],
    queryFn: () => deviceRZAApi.parameters(deviceId!),
    enabled: deviceId !== null,
  })
}

export function useDeviceComponents(deviceId: number | null) {
  return useQuery({
    queryKey: [RZA_KEY, "components", deviceId],
    queryFn: () => deviceRZAApi.components(deviceId!),
    enabled: deviceId !== null,
  })
}

export function useAddDeviceParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, parameterId, price }: { deviceId: number; parameterId: number; price?: number }) =>
      deviceRZAApi.addParameter(deviceId, parameterId, price),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RZA_KEY] }),
  })
}

export function useRemoveDeviceParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, parameterId }: { deviceId: number; parameterId: number }) =>
      deviceRZAApi.removeParameter(deviceId, parameterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RZA_KEY] }),
  })
}

export function useAddDeviceComponent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, componentId, price }: { deviceId: number; componentId: number; price?: number }) =>
      deviceRZAApi.addComponent(deviceId, componentId, price),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RZA_KEY] }),
  })
}

export function useRemoveDeviceComponent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, componentId }: { deviceId: number; componentId: number }) =>
      deviceRZAApi.removeComponent(deviceId, componentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RZA_KEY] }),
  })
}

// ── ModRZA hooks ────────────────────────────────────────────────────

const MOD_KEY = "mod-rza"

export function useCreateModRZA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => modRZAApi.create(data as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MOD_KEY] })
      qc.invalidateQueries({ queryKey: [RZA_KEY] })
    },
  })
}

export function useUpdateModRZA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      modRZAApi.update(id, data as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MOD_KEY] })
      qc.invalidateQueries({ queryKey: [RZA_KEY] })
    },
  })
}

export function useDeleteModRZA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => modRZAApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MOD_KEY] })
      qc.invalidateQueries({ queryKey: [RZA_KEY] })
    },
  })
}

// ── Parameter hooks ─────────────────────────────────────────────────

const PARAM_KEY = "parameters"

export function useParameterList(params?: ListParams) {
  return useQuery({
    queryKey: [PARAM_KEY, "list", params],
    queryFn: () => parametersApi.list(params),
  })
}

export function useParameterTree() {
  return useQuery({
    queryKey: [PARAM_KEY, "tree"],
    queryFn: () => parametersApi.tree(),
  })
}

export function useParameterChildren(parentId: number | null) {
  return useQuery({
    queryKey: [PARAM_KEY, "children", parentId],
    queryFn: () => parametersApi.children(parentId!),
    enabled: parentId !== null,
  })
}

export function useCreateParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { parentId?: number; payload: Partial<import("../types").Parameter> }) =>
      data.parentId
        ? parametersApi.addChild(data.parentId, data.payload)
        : parametersApi.addRoot(data.payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PARAM_KEY] }),
  })
}

export function useUpdateParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import("../types").Parameter> }) =>
      parametersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PARAM_KEY] }),
  })
}

export function useDeleteParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => parametersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PARAM_KEY] }),
  })
}

// ── Parameter Values hooks ──────────────────────────────────────────

export function useParameterValues(parameterId: number | null) {
  return useQuery({
    queryKey: ["parameter-values", parameterId],
    queryFn: () => parameterValuesApi.list({ parameter: parameterId! }),
    enabled: parameterId !== null,
  })
}

export function useCreateParameterValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<import("../types").ParameterValue>) =>
      parameterValuesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parameter-values"] })
      qc.invalidateQueries({ queryKey: [PARAM_KEY] })
    },
  })
}

export function useDeleteParameterValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => parameterValuesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parameter-values"] })
      qc.invalidateQueries({ queryKey: [PARAM_KEY] })
    },
  })
}

// ── Product Category hooks ──────────────────────────────────────────

const CAT_KEY = "product-categories"

export function useProductCategoryTree() {
  return useQuery({
    queryKey: [CAT_KEY, "tree"],
    queryFn: () => productCategoriesApi.tree(),
  })
}

export function useProductCategoryChildren(parentId: number | null) {
  return useQuery({
    queryKey: [CAT_KEY, "children", parentId],
    queryFn: () => productCategoriesApi.children(parentId!),
    enabled: parentId !== null,
  })
}

export function useProductsInCategory(categoryId: number | null, params?: ListParams) {
  return useQuery({
    queryKey: [CAT_KEY, "products", categoryId, params],
    queryFn: () => productCategoriesApi.products(categoryId!, params),
    enabled: categoryId !== null,
  })
}

export function useCreateProductCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { parentId?: number; payload: Partial<import("../types").ProductCategory> }) =>
      data.parentId
        ? productCategoriesApi.addChild(data.parentId, data.payload)
        : productCategoriesApi.addRoot(data.payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CAT_KEY] }),
  })
}

// ── Component import trigger ────────────────────────────────────────

export function useTriggerComponentImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deviceComponentsExtApi.triggerImport(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["device-components"] }),
  })
}
