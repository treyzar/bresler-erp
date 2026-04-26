/** API-клиент админ-эндпоинтов EDO (доступны только группе `admin`). */
import api from "@/api/client"
import type { ApprovalChainTemplate, ColumnSpec, FieldSpec, FieldType } from "./types"

const BASE = "/edo/internal/admin"

export interface AdminDocumentType {
  code: string
  name: string
  description: string
  category: "memo" | "application" | "notification" | "travel" | "bonus" | "other"
  category_display: string
  icon: string
  field_schema: FieldSpec[]
  body_template: string
  title_template: string
  default_chain: number
  default_chain_detail: ApprovalChainTemplate
  numbering_sequence: number
  requires_drawn_signature: boolean
  visibility: "personal_only" | "department_visible" | "public"
  tenancy_override: "group_wide" | "company_only" | ""
  initiator_resolver: string
  addressee_mode: "none" | "single_user" | "dept_head"
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AdminChainStep {
  order: number
  role_key: string
  label: string
  action: "approve" | "sign" | "inform" | "notify_only"
  sla_hours?: number | null
  parallel_group?: string
  parallel_mode?: "and" | "or"
}

export interface AdminChainTemplate {
  id: number
  name: string
  description: string
  steps: AdminChainStep[]
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }

export const adminApi = {
  // ---- types ----
  listTypes: async (): Promise<AdminDocumentType[]> => {
    const r = await api.get<Paginated<AdminDocumentType> | AdminDocumentType[]>(`${BASE}/types/`)
    return Array.isArray(r.data) ? r.data : r.data.results
  },
  getType: async (code: string): Promise<AdminDocumentType> => {
    const r = await api.get<AdminDocumentType>(`${BASE}/types/${code}/`)
    return r.data
  },
  createType: async (payload: Partial<AdminDocumentType>): Promise<AdminDocumentType> => {
    const r = await api.post<AdminDocumentType>(`${BASE}/types/`, payload)
    return r.data
  },
  updateType: async (code: string, payload: Partial<AdminDocumentType>): Promise<AdminDocumentType> => {
    const r = await api.patch<AdminDocumentType>(`${BASE}/types/${code}/`, payload)
    return r.data
  },
  deleteType: async (code: string): Promise<void> => {
    await api.delete(`${BASE}/types/${code}/`)
  },

  // ---- chains ----
  listChains: async (): Promise<AdminChainTemplate[]> => {
    const r = await api.get<Paginated<AdminChainTemplate> | AdminChainTemplate[]>(`${BASE}/chains/`)
    return Array.isArray(r.data) ? r.data : r.data.results
  },
  getChain: async (id: number): Promise<AdminChainTemplate> => {
    const r = await api.get<AdminChainTemplate>(`${BASE}/chains/${id}/`)
    return r.data
  },
  createChain: async (payload: Partial<AdminChainTemplate>): Promise<AdminChainTemplate> => {
    const r = await api.post<AdminChainTemplate>(`${BASE}/chains/`, payload)
    return r.data
  },
  updateChain: async (id: number, payload: Partial<AdminChainTemplate>): Promise<AdminChainTemplate> => {
    const r = await api.patch<AdminChainTemplate>(`${BASE}/chains/${id}/`, payload)
    return r.data
  },
  deleteChain: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/chains/${id}/`)
  },
}

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Строка" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "markdown", label: "Markdown" },
  { value: "number", label: "Число" },
  { value: "money", label: "Сумма (₽)" },
  { value: "date", label: "Дата" },
  { value: "date_range", label: "Период (от-до)" },
  { value: "time", label: "Время" },
  { value: "boolean", label: "Да / Нет" },
  { value: "choice", label: "Выбор из списка" },
  { value: "user", label: "Пользователь" },
  { value: "user_multi", label: "Несколько пользователей" },
  { value: "orgunit", label: "Организация" },
  { value: "department", label: "Подразделение" },
  { value: "file", label: "Файл" },
  { value: "table", label: "Таблица" },
]

export const COLUMN_TYPE_OPTIONS = FIELD_TYPE_OPTIONS.filter((o) => o.value !== "table")

/** Пресеты role_key, сгруппированные по семантике для удобства выбора в UI.
 *  ⚠ Должны коррелировать с Department.UnitType на бэкенде:
 *  apps/directory/models/department.py — class UnitType. */
export const ROLE_KEY_PRESETS: { value: string; label: string }[] = [
  // Прямые отношения автора
  { value: "supervisor", label: "Непосредственный руководитель автора" },
  { value: "author", label: "Автор документа (для обратных потоков)" },

  // Поиск по типу подразделения (надёжно: не зависит от глубины автора)
  { value: "dept_head_type:management", label: "Руководитель управляющей компании" },
  { value: "dept_head_type:division", label: "Руководитель дирекции / управления" },
  { value: "dept_head_type:service", label: "Руководитель службы" },
  { value: "dept_head_type:department", label: "Руководитель отдела" },
  { value: "dept_head_type:bureau", label: "Руководитель бюро" },
  { value: "dept_head_type:sector", label: "Руководитель сектора" },
  { value: "dept_head_type:group", label: "Руководитель группы" },
  { value: "dept_head_type:site", label: "Руководитель участка" },
  { value: "dept_head_type:laboratory", label: "Руководитель лаборатории" },
  { value: "dept_head_type:branch", label: "Руководитель филиала" },

  // Относительный walk-up по дереву (зависит от глубины автора)
  { value: "dept_head:self", label: "Руководитель моего подразделения" },
  { value: "dept_head:parent", label: "Руководитель родительского подразделения" },
  { value: "dept_head:up(2)", label: "Руководитель на 2 уровня выше (up(2))" },
  { value: "dept_head:up(3)", label: "Руководитель на 3 уровня выше (up(3))" },

  // Topmost фолбэк
  { value: "company_head", label: "Директор компании (самый верхний уровень)" },

  // Функциональные группы
  { value: "group:accounting@company", label: "Бухгалтерия (моей компании)" },
  { value: "group:hr@company", label: "Отдел кадров (моей компании)" },
  { value: "group:admin", label: "Администраторы" },

  // Прибито к конкретному человеку
  { value: "fixed_user:", label: "Конкретный сотрудник (дописать ID после двоеточия)" },
]

export const ACTION_OPTIONS = [
  { value: "approve", label: "Согласовать" },
  { value: "sign", label: "Подписать" },
  { value: "inform", label: "Ознакомить" },
  { value: "notify_only", label: "Только уведомить" },
] as const

export type Empty = Record<string, never>
export type _ColumnSpec = ColumnSpec
