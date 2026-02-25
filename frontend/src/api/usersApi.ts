import client from "./client"
import type { User } from "./types"

export const usersApi = {
  getMe: (): Promise<User> => client.get("/users/me/").then((r) => r.data),
  updateMe: (data: Partial<User>): Promise<User> =>
    client.patch("/users/me/", data).then((r) => r.data),
}
