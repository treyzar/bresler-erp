import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "@/api/types"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => void
  hasModuleAccess: (module: string) => boolean
  hasGroup: (group: string) => boolean
  isManager: () => boolean
  canAccessDashboard: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
      hasModuleAccess: (module: string) => {
        const { user, isAuthenticated } = get()
        // User data not loaded yet — don't hide menu items
        if (!user) return isAuthenticated
        if (user.allowed_modules === undefined) return true
        return user.allowed_modules.includes(module)
      },
      hasGroup: (group: string) => {
        const { user } = get()
        return user?.groups?.includes(group) ?? false
      },
      isManager: () => {
        const { user } = get()
        if (!user?.groups) return false
        return user.groups.some((g) => ["admin", "otm"].includes(g))
      },
      canAccessDashboard: () => {
        const { user } = get()
        if (!user) return false
        if (user.is_department_head) return true
        return user.groups?.includes("admin") ?? false
      },
    }),
    {
      name: "bresler-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
)
