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
  is_department_head: boolean
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

export const FILE_CATEGORIES = {
  general: "Общий",
  incoming: "Входящий",
  outgoing: "Исходящий",
  contract: "Договор",
  specification: "Спецификация",
  letter: "Письмо",
  rkd: "РКД",
  other: "Другое",
} as const

export interface OrderFile {
  id: number
  file: string
  original_name: string
  file_size: number
  category: string
  description: string
  created_at: string
}

export const CONTRACT_PAYMENT_TEMPLATES = {
  "50_50": "50% аванс, 50% перед отгрузкой",
  "100_post_7": "100% в течение 7 дней после отгрузки",
  "100_post_30": "100% в течение 30 дней после отгрузки",
  custom: "Произвольные условия",
} as const

export interface Contract extends BaseEntity {
  contract_number: string
  contract_date: string | null
  status: string
  payment_template: string
  advance_percent: string
  intermediate_percent: string
  post_payment_percent: string
  amount: string | null
  deadline_days: number | null
}

export interface OrderDetail extends BaseEntity {
  order_number: number
  order_type: string
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
  shipment_batches: ShipmentBatch[]
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

// Specs / Commercial Offers

export const ORDER_TYPES = {
  standard: "Стандартный",
  warranty: "Гарантийный ремонт",
  niokr: "НИОКР",
  replacement: "Замена",
} as const

export const OFFER_STATUSES = {
  draft: "Черновик",
  sent: "Отправлено",
  accepted: "Принято",
  rejected: "Отклонено",
  expired: "Истекло",
} as const

export const PAYMENT_TERMS = {
  "50_50": "50% аванс, 50% перед отгрузкой",
  "100_post_7": "100% в течение 7 дней после отгрузки",
  "100_post_30": "100% в течение 30 дней после отгрузки",
  custom: "Произвольные условия",
} as const

export const MANUFACTURING_PERIODS = [
  "30-60", "60-90", "90-120", "120-150", "150-180",
] as const

export const WARRANTY_MONTHS_OPTIONS = [12, 36, 60] as const
export const VALID_DAYS_OPTIONS = [14, 30, 60] as const

export interface OfferWorkItem {
  id: number
  work_type: number
  work_type_name: string
  included: boolean
  days: number
  specialists: number
  trips: number
  unit_price: string
  pricing_mode: string
}

export interface SpecificationLine {
  id?: number
  line_number: number
  product: number | null
  product_name?: string | null
  device_rza: number | null
  device_rza_name?: string | null
  mod_rza: number | null
  mod_rza_name?: string | null
  name: string
  quantity: number
  unit_price: string
  total_price: string
  delivery_date: string | null
  note: string
}

export interface OfferSpecification {
  id: number
  total_amount: string
  total_amount_with_vat: string
  lines: SpecificationLine[]
}

export interface CommercialOfferListItem {
  id: number
  offer_number: string
  version: number
  status: string
  date: string
  valid_until: string | null
  participant: number
  participant_name: string
  manager: number | null
  manager_name: string
  vat_rate: string
  payment_terms: string
  total_amount: string | null
}

export interface CommercialOfferDetail extends BaseEntity {
  offer_number: string
  version: number
  status: string
  date: string
  valid_days: number
  valid_until: string | null
  order: number
  participant: number
  participant_name: string
  manager: number | null
  manager_name: string
  executor: number | null
  executor_name: string
  based_on: number | null
  based_on_number: string | null
  vat_rate: string
  payment_terms: string
  advance_percent: string
  pre_shipment_percent: string
  post_payment_percent: string
  manufacturing_period: string
  warranty_months: number
  delivery_included: boolean
  delivery_city: string
  additional_conditions: string
  is_template: boolean
  shipment_condition_text: string
  work_items: OfferWorkItem[]
  specification: OfferSpecification | null
}

// Calculation

export const OVERHEAD_TYPES = {
  equipment: "Оборудование (15%)",
  purchased: "Покупное (30%)",
  nku: "НКУ (30%)",
  custom: "Произвольный",
} as const

export const OVERHEAD_DEFAULTS: Record<string, number> = {
  equipment: 15,
  purchased: 30,
  nku: 30,
  custom: 0,
}

export const OPTION_TYPES = {
  none: "Основная позиция",
  parameter: "Параметр/функция",
  delivery: "Доставка",
  work: "Работа",
  other: "Прочее",
} as const

export const PRICING_MODES = {
  separate: "Отдельная строка",
  included: "Включено в стоимость",
} as const

export interface CalculationLine {
  id?: number
  line_number: number
  product: number | null
  product_name?: string | null
  device_rza: number | null
  device_rza_name?: string | null
  mod_rza: number | null
  mod_rza_name?: string | null
  name: string
  quantity: number
  is_optional: boolean
  option_type: string
  pricing_mode: string
  parent_line: number | null
  base_price: string
  overhead_type: string
  overhead_percent: string
  price_with_overhead: string
  project_coeff: string
  estimated_price: string
  discount_coeff: string
  discounted_price: string
  total_price: string
  note: string
}

export interface OfferCalculation {
  id: number
  default_overhead_percent: string
  default_project_coeff: string
  default_discount_coeff: string
  delivery_price: string
  delivery_pricing_mode: string
  note: string
  lines: CalculationLine[]
  total: {
    base: string
    estimated: string
    discounted: string
  }
}

export interface ParticipantContact {
  id: number
  participant: number
  contact: number
  contact_name: string
  is_primary: boolean
}

// Document templates

export const DOCUMENT_TYPES = {
  contract: "Типовой договор",
  readiness_letter: "Письмо о готовности",
  overdue_letter: "Письмо о просрочке",
  payment_letter: "Письмо об оплате",
  protocol: "Протокол разногласий",
  other: "Другое",
} as const

export const COMPANY_ENTITIES = {
  npp: "НПП Бреслер",
  chak: "ЧАК",
  technopark: "Технопарк",
} as const

export interface DocumentTemplate {
  id: number
  name: string
  document_type: string
  document_type_display: string
  entity: string
  entity_display: string
  template_file: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Shipment batches

export interface ShipmentBatch {
  id: number
  batch_number: number
  ship_date: string
  description: string
  created_at: string
  updated_at: string
}

// Import

export interface ImportSession {
  id: number
  original_filename: string
  target_model: string
  status: "upload" | "mapping" | "validating" | "processing" | "complete" | "error"
  columns: string[]
  column_mapping: Record<string, string>
  total_rows: number
  success_count: number
  error_count: number
  error_details: { row: number; field: string; message: string }[]
  created_at: string
  updated_at: string
}

export const IMPORT_TARGET_MODELS: Record<string, string> = {
  orgunit: "Организации",
  contact: "Контакты",
  equipment: "Оборудование",
  typeofwork: "Виды работ",
  facility: "Объекты",
}

// Comments

export interface Comment {
  id: number
  author: number
  author_name: string
  author_username: string
  text: string
  content_type: number
  object_id: number
  created_at: string
  updated_at: string
}

// Notifications

export interface Notification {
  id: number
  title: string
  message: string
  category: "info" | "success" | "warning" | "error"
  is_read: boolean
  link: string
  target_repr: string | null
  created_at: string
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
