import client from "./client"
import type { ListParams, PaginatedResponse, User } from "./types"

export interface MyOrderItem {
  id: number
  order_number: number
  status: string
  status_display: string
  customer_name: string | null
  ship_date: string | null
  contract_number: string | null
  contract_amount: string | null
  payment_status: string | null
}

export interface MyOrdersResponse {
  stats: {
    total: number
    in_progress: number
    overdue: number
    shipped: number
  }
  orders: MyOrderItem[]
  count: number
  page: number
  page_size: number
}

export interface ActivityItem {
  id: number
  title: string
  message: string
  category: string
  link: string
  is_read: boolean
  created_at: string
}

export interface MyCustomer {
  id: number
  name: string
  full_name: string
  business_role: string
}

export interface MyOfferItem {
  id: number
  offer_number: string
  version: number
  status: string
  date: string
  participant_name: string
  order_number: number
  order_id: number
}

export interface ManagerStats {
  total_orders: number
  shipped: number
  in_progress: number
  total_kp: number
  accepted_kp: number
  conversion: number
  my_share: number
  top_customers: { name: string; count: number }[]
  top_equipment: { name: string; count: number }[]
  by_year: { year: number | null; count: number; amount: number }[]
}

export const usersApi = {
  list: (params?: ListParams): Promise<PaginatedResponse<User>> =>
    client.get("/users/", { params }).then((r) => r.data),

  getMe: (): Promise<User> => client.get("/users/me/").then((r) => r.data),

  updateMe: (data: Partial<User>): Promise<User> =>
    client.patch("/users/me/", data).then((r) => r.data),

  changePassword: (data: { current_password: string; new_password: string; new_password_confirm: string }) =>
    client.post("/users/me/change-password/", data).then((r) => r.data),

  uploadAvatar: (file: File): Promise<{ avatar: string | null }> => {
    const formData = new FormData()
    formData.append("avatar", file)
    return client.post("/users/me/avatar/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data)
  },

  deleteAvatar: () => client.delete("/users/me/avatar/"),

  myOrders: (params?: { group?: string; year?: string; page?: number; page_size?: number }): Promise<MyOrdersResponse> =>
    client.get("/users/me/orders/", { params }).then((r) => r.data),

  myCustomers: (): Promise<MyCustomer[]> =>
    client.get("/users/me/customers/").then((r) => r.data),

  addCustomer: (orgUnitId: number) =>
    client.post("/users/me/customers/", { org_unit_id: orgUnitId }).then((r) => r.data),

  removeCustomer: (orgUnitId: number) =>
    client.delete("/users/me/customers/", { data: { org_unit_id: orgUnitId } }),

  myOffers: (): Promise<MyOfferItem[]> =>
    client.get("/users/me/offers/").then((r) => r.data),

  myStats: (): Promise<ManagerStats> =>
    client.get("/users/me/stats/").then((r) => r.data),

  activity: (limit = 20): Promise<{ results: ActivityItem[] }> =>
    client.get("/users/me/activity/", { params: { limit } }).then((r) => r.data),
}
