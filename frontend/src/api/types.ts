// Core types

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  patronymic: string
  full_name: string
  phone: string
  extension_number: string
  position: string
  department: string
  company: string
  avatar: string | null
  is_active: boolean
  groups?: string[]
}

export interface TokenResponse {
  access: string
  refresh: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Directory types

export interface BaseEntity {
  id: number
  created_at: string
  updated_at: string
}

export interface SimpleReference extends BaseEntity {
  name: string
}

export interface Country extends BaseEntity {
  name: string
  code: string
}

export interface City extends BaseEntity {
  name: string
  country: number
  country_name: string
}

export interface OrgUnit extends BaseEntity {
  name: string
  full_name: string
  unit_type: string
  business_role: string
  is_legal_entity: boolean
  country: number | null
  country_name: string
  inn: string
  kpp: string
  ogrn: string
  external_code: string
  address: string
  previous_names: string[]
  is_active: boolean
  depth: number
  children_count: number
}

export interface OrgUnitTreeNode {
  id: number
  name: string
  unit_type: string
  business_role: string
  is_active: boolean
  children: OrgUnitTreeNode[]
}

export interface Contact extends BaseEntity {
  full_name: string
  position: string
  email: string
  phone: string
  address: string
  city: number | null
  company: string
  org_units: number[]
}

export interface PQ extends BaseEntity {
  name: string
  full_name: string
  previous_names: string[]
}

export type Equipment = SimpleReference
export type TypeOfWork = SimpleReference
export type DeliveryType = SimpleReference
export type Intermediary = SimpleReference
export type Designer = SimpleReference

export interface ListParams {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  [key: string]: string | number | boolean | undefined
}
