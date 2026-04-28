import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Columns,
  Rows,
  Combine,
  Trash2,
  Grid,
} from "lucide-react";

interface TableContextMenuProps {
  children: React.ReactNode;
  onAddRow: () => void;
  onAddCol: () => void;
  onDeleteRow: () => void;
  onDeleteCol: () => void;
  onMerge: () => void;
  onSplit: () => void;
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  children,
  onAddRow,
  onAddCol,
  onDeleteRow,
  onDeleteCol,
  onMerge,
  onSplit,
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={onAddRow}>
          <Rows className="mr-2 h-4 w-4" />
          <span>Добавить строку ниже</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddCol}>
          <Columns className="mr-2 h-4 w-4" />
          <span>Добавить столбец справа</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onMerge}>
          <Combine className="mr-2 h-4 w-4" />
          <span>Объединить ячейки</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={onSplit}>
          <Grid className="mr-2 h-4 w-4" />
          <span>Разбить ячейки</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDeleteRow} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Удалить строку</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={onDeleteCol} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Удалить столбец</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
