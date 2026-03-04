import { useAuthStore } from "./useAuthStore"
import type { User } from "@/api/types"

const mockUser: User = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  patronymic: "",
  full_name: "User Test",
  phone: "",
  extension_number: "",
  position: "",
  department: "",
  company: "",
  avatar: null,
  is_active: true,
  last_login: null,
  date_joined: "2024-01-01T00:00:00Z",
}

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
  })

  it("starts with default unauthenticated state", () => {
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it("setTokens sets tokens and marks authenticated", () => {
    useAuthStore.getState().setTokens("access-123", "refresh-456")

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe("access-123")
    expect(state.refreshToken).toBe("refresh-456")
    expect(state.isAuthenticated).toBe(true)
  })

  it("setUser sets the user object", () => {
    useAuthStore.getState().setUser(mockUser)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.user?.username).toBe("testuser")
  })

  it("logout clears all auth state", () => {
    useAuthStore.getState().setTokens("access", "refresh")
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it("setTokens does not affect user", () => {
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().setTokens("new-access", "new-refresh")

    expect(useAuthStore.getState().user).toEqual(mockUser)
  })
})
