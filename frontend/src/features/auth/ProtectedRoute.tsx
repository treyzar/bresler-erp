import { useEffect } from "react"
import { Navigate, Outlet } from "react-router"
import { useAuthStore } from "@/stores/useAuthStore"
import apiClient from "@/api/client"
import type { User } from "@/api/types"

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (isAuthenticated) {
      apiClient
        .get<User>("/users/me/")
        .then((res) => setUser(res.data))
        .catch(() => logout())
    }
  }, [isAuthenticated, setUser, logout])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
