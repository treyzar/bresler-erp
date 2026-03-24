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
  last_login: string | null
  date_joined: string
  groups?: string[]
  allowed_modules?: string[]
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

export const ORG_UNIT_TYPES: Record<string, string> = {
  company: "Головная компания / Холдинг",
  branch: "Филиал / Дочерняя компания",
  division: "Производственное отделение",
  department: "Участок",
  site: "Площадка",
  other: "Другое",
}

export const ORG_UNIT_BUSINESS_ROLES: Record<string, string> = {
  customer: "Заказчик",
  supplier: "Поставщик",
  participant: "Участник запроса",
  internal: "Внутренняя компания",
  partner: "Партнёр / Посредник",
  manufacturer: "Производитель оборудования",
  contractor: "Генподрядчик",
  designer: "Проектировщик",
  expertise: "Орган экспертизы",
  buyer_branch: "Филиал-покупатель (Legacy)",
  shipment_site: "Площадка отгрузки (Legacy)",
  other: "Другое",
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

export interface Facility extends BaseEntity {
  name: string
  org_unit: number | null
  org_unit_name: string
  address: string
  description: string
  is_active: boolean
}

export type Equipment = SimpleReference
export type TypeOfWork = SimpleReference
export type DeliveryType = SimpleReference

export interface ListParams {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  [key: string]: string | number | boolean | undefined
}

// Order types

export const ORDER_STATUSES = {
  N: "Новый",
  D: "Договор",
  P: "Производство",
  C: "Собран",
  S: "Отгружен",
  A: "Архив",
} as const

export const CONTRACT_STATUSES = {
  not_paid: "Не оплачен",
  advance_paid: "Аванс оплачен",
  intermediate: "Промежуточная оплата",
  fully_paid: "Полностью оплачен",
} as const

export interface OrderListItem {
  id: number
  order_number: number
  tender_number: string
  status: string
  status_display: string
  country_name: string
  customer_name: string
  branch_name: string
  division_name: string
  facility_names: string
  equipment_names: string
  work_names: string
  participant_names: string
  start_date: string | null
  ship_date: string | null
  note: string
  created_at: string
}

export interface OrderOrgUnitEntry {
  id: number
  org_unit: number
  org_unit_name: string
  role: string
  order_index: number
  note: string
}

export interface OrderParticipantEntry {
  id: number
  org_unit: number
  org_unit_name: string
  order_index: number
}

export interface OrderFile {
  id: number
  file: string
  original_name: string
  file_size: number
  created_at: string
}

export interface Contract extends BaseEntity {
  contract_number: string
  contract_date: string | null
  status: string
  advance_percent: string
  intermediate_percent: string
  post_payment_percent: string
  amount: string | null
  deadline_days: number | null
}

export interface OrderDetail extends BaseEntity {
  order_number: number
  tender_number: string
  status: string
  status_display: string
  note: string
  start_date: string | null
  ship_date: string | null
  customer_org_unit: number | null
  customer_name: string
  intermediary: number | null
  intermediary_name: string
  designer: number | null
  designer_name: string
  country: number | null
  country_name: string
  contract: Contract | null
  order_org_units: OrderOrgUnitEntry[]
  order_participants: OrderParticipantEntry[]
  files: OrderFile[]
  manager_ids: number[]
  manager_names: { id: number; name: string }[]
  contact_ids: number[]
  contact_names: { id: number; name: string }[]
  equipment_ids: number[]
  equipment_names: { id: number; name: string }[]
  work_ids: number[]
  work_names: { id: number; name: string }[]
  facility_ids: number[]
  facility_names: { id: number; name: string; org_unit_name: string }[]
  related_orders: number[]
}

export interface OrderHistoryRecord {
  id: number
  date: string
  user: string | null
  type: string
  changes: { field: string; old: string; new: string }[]
}
