/** Route-level гейт по членству в Django Group(ах).
 *
 *  Симметричен `ModuleGuard`. Не дублирует серверную защиту — это UX-слой,
 *  чтобы пользователь, забредший по URL без прав, не упёрся в пустой
 *  список с тихими 403-ями, а сразу попал на /403.
 *
 *  Семантика: `group="admin"` — обязан быть в группе `admin`;
 *  `group={["admin", "otm"]}` — достаточно одной из перечисленных (OR).
 *  Superuser (= имплементируется на бэке) фронту виден как член группы
 *  `admin` через user.groups, поэтому отдельного флага не требуется.
 */
import { Navigate, Outlet } from "react-router"
import { useAuthStore } from "@/stores/useAuthStore"

interface GroupGuardProps {
  group: string | string[]
}

export function GroupGuard({ group }: GroupGuardProps) {
  const hasGroup = useAuthStore((s) => s.hasGroup)
  const groups = Array.isArray(group) ? group : [group]
  const allowed = groups.some((g) => hasGroup(g))

  if (!allowed) {
    return <Navigate to="/403" replace />
  }
  return <Outlet />
}
