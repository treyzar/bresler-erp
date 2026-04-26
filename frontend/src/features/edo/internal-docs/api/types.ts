export type FieldType =
  | "text" | "textarea" | "markdown"
  | "number" | "money"
  | "date" | "date_range" | "time"
  | "boolean" | "choice"
  | "user" | "user_multi"
  | "orgunit" | "department"
  | "file"
  | "table"

/** Колонка внутри type=table. Не может быть вложенной таблицей. */
export interface ColumnSpec {
  name: string
  label?: string
  type: Exclude<FieldType, "table">
}

export interface FieldSpec {
  name: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  help_text?: string
  choices?: [string, string][]
  filter?: Record<string, unknown>
  /** Только для type=table: описание колонок строки. */
  columns?: ColumnSpec[]
}

/** Значение для type=date_range. */
export interface DateRangeValue {
  from: string | null
  to: string | null
}

export interface ApprovalChainStep {
  order: number
  role_key: string
  label: string
  action: "approve" | "sign" | "notify_only" | "inform"
  sla_hours?: number | null
  parallel_group?: string
}

export interface ApprovalChainTemplate {
  id: number
  name: string
  description: string
  steps: ApprovalChainStep[]
  is_default: boolean
  is_active: boolean
}

export interface DocumentType {
  code: string
  name: string
  description: string
  category: "memo" | "application" | "notification" | "travel" | "bonus" | "other"
  category_display: string
  icon: string
  field_schema: FieldSpec[]
  body_template: string
  title_template: string
  default_chain: ApprovalChainTemplate
  requires_drawn_signature: boolean
  visibility: "personal_only" | "department_visible" | "public"
  tenancy_override: "group_wide" | "company_only" | ""
  initiator_resolver: string
  addressee_mode: "none" | "single_user" | "dept_head"
  is_active: boolean
}

export interface UserLite {
  id: number
  full_name: string
  full_name_short: string
  position: string
}

export type DocumentStatus =
  | "draft" | "pending" | "approved" | "rejected"
  | "revision_requested" | "cancelled"

export type ApprovalStepStatus =
  | "pending" | "approved" | "rejected" | "revision_requested" | "skipped" | "delegated"

export interface ApprovalStep {
  id: number
  order: number
  parallel_group: string
  role_key: string
  role_label: string
  action: ApprovalChainStep["action"]
  action_display: string
  approver: UserLite | null
  original_approver: UserLite | null
  status: ApprovalStepStatus
  status_display: string
  decided_at: string | null
  comment: string
  sla_due_at: string | null
}

export interface DocumentListItem {
  id: number
  number: string
  title: string
  type_code: string
  type_name: string
  type_icon: string
  status: DocumentStatus
  status_display: string
  author: UserLite
  addressee: UserLite | null
  current_step_label: string | null
  current_step_approver: UserLite | null
  created_at: string
  submitted_at: string | null
  closed_at: string | null
}

export interface DocumentAttachment {
  id: number
  file_url: string
  file_name: string
  file_size: number
  uploaded_by: UserLite
  step: number | null
  uploaded_at: string
}

export interface DocumentDetail {
  id: number
  number: string
  title: string
  type: DocumentType
  author: UserLite
  addressee: UserLite | null
  field_values: Record<string, unknown>
  field_values_display: Record<string, string>
  body_rendered: string
  header_snapshot: Record<string, string>
  chain_snapshot: ApprovalChainStep[]
  status: DocumentStatus
  status_display: string
  current_step: number | null
  steps: ApprovalStep[]
  attachments: DocumentAttachment[]
  created_at: string
  submitted_at: string | null
  closed_at: string | null
}

export interface ListParams {
  tab?: "inbox" | "outbox" | "drafts" | "archive"
  status?: DocumentStatus
  type?: string
  page?: number
  page_size?: number
}

export interface CreateDocumentPayload {
  type: string
  field_values: Record<string, unknown>
  title?: string
  addressee?: number | null
}
