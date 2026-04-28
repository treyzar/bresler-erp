import React, { useState, useEffect } from "react"
import { TableNode } from "../TableElement/TableNode"
import type { IElementProps } from "./types"

export const TableElement: React.FC<IElementProps> = ({
  element,
  isSelected,
  onSelect,
  onMouseDown,
  onUpdateProp,
}) => {
  const [isEditingTable, setIsEditingTable] = useState(false)

  useEffect(() => {
    if (!isSelected && isEditingTable) {
      setIsEditingTable(false)
    }
  }, [isSelected, isEditingTable])

  const tableStyle: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    cursor: isEditingTable ? "default" : "move",
    boxSizing: "border-box",
    zIndex: element.zIndex ?? 0,
    border: isSelected
      ? "2px dashed hsl(var(--primary))"
      : "1px dashed hsl(var(--border))",
    boxShadow: isSelected ? "0 0 0 2px hsl(var(--primary) / 0.2)" : "none",
  }

  return (
    <div
      style={tableStyle}
      onClick={(e) => {
        if (!isEditingTable) {
          e.stopPropagation()
          onSelect()
        }
      }}
      onMouseDown={(e) => {
        if (!isEditingTable) {
          e.stopPropagation()
          onMouseDown(e, element.id)
        } else {
          e.stopPropagation()
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setIsEditingTable(true)
      }}
      className="table-element group"
    >
      <TableNode
        element={element}
        isSelected={isSelected}
        isEditing={isEditingTable}
        onUpdateProp={onUpdateProp}
      />
      {isSelected && !isEditingTable && (
        <div
          style={{
            position: "absolute",
            bottom: -24,
            left: 0,
            fontSize: 11,
            color: "#888",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          Двойной клик для редактирования
        </div>
      )}
    </div>
  )
}
