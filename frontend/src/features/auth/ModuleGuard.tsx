import { Navigate, Outlet } from "react-router"
import { useAuthStore } from "@/stores/useAuthStore"

interface ModuleGuardProps {
  module: string
}

export function ModuleGuard({ module }: ModuleGuardProps) {
  const hasAccess = useAuthStore((s) => s.hasModuleAccess(module))

  if (!hasAccess) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
