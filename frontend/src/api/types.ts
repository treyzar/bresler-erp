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

// Devices / Catalog types

export interface VoltageClass extends BaseEntity {
  name: string
  description: string
}

export interface DeviceRZA extends BaseEntity {
  rza_name: string
  rza_name_rod: string
  rza_short_name: string
  rza_code: string
  modifications_count?: number
  parameters_count?: number
  components_count?: number
}

export interface ModRZA extends BaseEntity {
  device_rza: number
  device_rza_name?: string
  mod_name: string
  mod_code: string
  alter_mod_code: string
  sec_mod_code: string
  full_code?: string
  parameters_count?: number
  components_count?: number
}

export interface Parameter {
  id: number
  name: string
  parameter_type: string
  is_leaf: boolean
  can_add_multiple: boolean
  comment: string
  created_at: string
  values?: ParameterValue[]
  children_count?: number
  depth?: number
}

export interface ParameterValue {
  id: number
  parameter: number
  value: string
  is_custom_value: boolean
}

export interface ComponentType extends BaseEntity {
  name: string
  components_count?: number
}

export interface DeviceComponent extends BaseEntity {
  produx_id: number
  component_name: string
  component_type: number
  component_type_name?: string
  is_active: boolean
  additional_data: Record<string, unknown> | null
}

export interface DeviceRZAParameter {
  id: number
  device_rza: number
  parameter: number
  parameter_name?: string
  parameter_type?: string
  price: string
}

export interface ModRZAParameter {
  id: number
  mod_rza: number
  parameter: number
  parameter_name?: string
  parameter_type?: string
  price: string
}

export interface DeviceRZAComponent {
  id: number
  device_rza: number
  component: number
  component_name?: string
  component_type_name?: string
  price: string
}

export interface ModRZAComponent {
  id: number
  mod_rza: number
  component: number
  component_name?: string
  component_type_name?: string
  price: string
}

export interface ProductCategory {
  id: number
  name: string
  short_name: string
  slug: string
  description: string
  is_active: boolean
  depth: number
  level_name?: string
  full_path?: string
  created_at: string
  updated_at: string
  children?: ProductCategoryTree[]
}

export interface ProductCategoryTree {
  id: number
  name: string
  short_name: string
  slug: string
  is_active: boolean
  depth: number
  children: ProductCategoryTree[]
}

export interface ProductType extends BaseEntity {
  name: string
  code: string
  mark: string
  description: string
  is_active: boolean
}

export interface Product extends BaseEntity {
  name: string
  internal_code: string
  slug: string
  product_type: number | null
  product_type_name?: string
  uom: string
  base_price: string
  currency: string
  vat_rate: string
  price_with_vat: boolean
  track_serial: boolean
  is_active: boolean
  is_spare_part: boolean
  valid_from: string | null
  valid_to: string | null
  rza_spec?: RZASpec | null
  categories?: { id: number; name: string; full_path: string }[]
  bom_lines?: ProductBOMLine[]
}

export interface RZASpec {
  id: number
  product: number
  device_rza: number
  device_rza_code?: string
  device_rza_name?: string
  mod_rza: number | null
  mod_rza_code?: string
  description: string
}

export interface ProductBOMLine {
  id: number
  parent: number
  child: number
  child_name?: string
  child_code?: string
  role: string
  quantity: number
  slot_label: string
  track_serial_override: boolean | null
}

export interface ProductAttribute extends BaseEntity {
  code: string
  name: string
  unit: string
  value_type: string
  options?: ProductAttributeOption[]
}

export interface ProductAttributeOption {
  id: number
  attribute: number
  code: string
  label: string
  sort_order: number
}

export const PARAMETER_TYPES: Record<string, string> = {
  select: "Выбор из списка",
  custom: "Пользовательское значение",
  composite: "Составной параметр",
}

export const PRODUCT_CURRENCIES: Record<string, string> = {
  RUB: "₽ RUB",
  EUR: "€ EUR",
  USD: "$ USD",
}

export const BOM_ROLES: Record<string, string> = {
  RZA_TERMINAL: "МП терминал РЗА",
  ACCESSORY: "Аксессуар/узел",
  WIRING: "Проводка/шкафной монтаж",
  MISC: "Прочее",
}
