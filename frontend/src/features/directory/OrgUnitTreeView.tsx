import { useState } from "react"
import { ChevronRight, Folder, FolderOpen, Pencil, Trash2, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { OrgUnitTreeNode } from "@/api/types"
import { UNIT_TYPES } from "@/lib/constants"

interface OrgUnitTreeViewProps {
  data: OrgUnitTreeNode[]
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
}

export function OrgUnitTreeView({ data, onEdit, onDelete }: OrgUnitTreeViewProps) {
  return (
    <div className="space-y-1">
      {data.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

interface TreeNodeProps {
  node: OrgUnitTreeNode
  level?: number
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
}

function TreeNode({ node, level = 0, onEdit, onDelete }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = node.children && node.children.length > 0

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "group flex items-center gap-2 py-1 px-2 rounded-md hover:bg-accent/50 hover:text-accent-foreground transition-colors",
          !node.is_active && "opacity-60",
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <div className="flex items-center size-6 shrink-0">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 p-0 hover:bg-accent"
              >
                <ChevronRight
                  className={cn("size-4 transition-transform", isOpen && "rotate-90")}
                />
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="size-6" /> // spacer to align icons
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            isOpen ? (
              <FolderOpen className="size-4 text-primary shrink-0" />
            ) : (
              <Folder className="size-4 text-primary shrink-0" />
            )
          ) : (
            <Building2 className="size-4 text-muted-foreground shrink-0" />
          )}

          <span className="text-sm font-medium truncate">{node.name}</span>

          <Badge variant="outline" className="text-[10px] px-1 h-4 font-normal whitespace-nowrap opacity-70">
            {UNIT_TYPES[node.unit_type as keyof typeof UNIT_TYPES] || node.unit_type}
          </Badge>

          {!node.is_active && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4 font-normal">
              Неактивна
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-background shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(node.id)
              }}
              title="Редактировать"
            >
              <Pencil className="size-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10 hover:bg-background shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(node.id)
              }}
              title="Удалить"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {hasChildren && (
        <CollapsibleContent>
          <div className="mt-0">
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}
