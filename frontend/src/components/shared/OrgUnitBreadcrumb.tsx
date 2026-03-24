import { ChevronRight } from "lucide-react"
import { useOrgUnitAncestors } from "@/api/hooks/useOrgUnits"

interface OrgUnitBreadcrumbProps {
  orgUnitId: number
  orgUnitName: string
}

export function OrgUnitBreadcrumb({ orgUnitId, orgUnitName }: OrgUnitBreadcrumbProps) {
  const { data: ancestors } = useOrgUnitAncestors(orgUnitId)

  if (!ancestors || ancestors.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">{orgUnitName}</span>
    )
  }

  return (
    <div className="flex items-center flex-wrap gap-0.5 text-xs text-muted-foreground">
      {ancestors.map((a, i) => (
        <span key={a.id} className="flex items-center gap-0.5">
          {i > 0 && <ChevronRight className="size-3 shrink-0" />}
          <span>{a.name}</span>
        </span>
      ))}
      <ChevronRight className="size-3 shrink-0" />
      <span className="font-medium text-foreground">{orgUnitName}</span>
    </div>
  )
}
