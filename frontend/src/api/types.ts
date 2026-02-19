// Auto-generated types will be placed here by `make types`
// For now, define core types manually

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
