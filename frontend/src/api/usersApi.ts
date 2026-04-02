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
}

export interface MyOrdersResponse {
  stats: {
    total: number
    in_progress: number
    overdue: number
  }
  orders: MyOrderItem[]
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

  myOrders: (status?: string): Promise<MyOrdersResponse> =>
    client.get("/users/me/orders/", { params: status ? { status } : {} }).then((r) => r.data),

  activity: (limit = 20): Promise<{ results: ActivityItem[] }> =>
    client.get("/users/me/activity/", { params: { limit } }).then((r) => r.data),
}
