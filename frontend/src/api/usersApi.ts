import client from "./client"
import type { ListParams, PaginatedResponse, User } from "./types"

export const usersApi = {
  list: (params?: ListParams): Promise<PaginatedResponse<User>> =>
    client.get("/users/", { params }).then((r) => r.data),
  getMe: (): Promise<User> => client.get("/users/me/").then((r) => r.data),
  updateMe: (data: Partial<User>): Promise<User> =>
    client.patch("/users/me/", data).then((r) => r.data),
}
