import React from "react"
import type { IDateProperties } from "../../../utils/types/editor.types"
import { getCommonStyle } from "./helpers"
import type { IElementProps } from "./types"

export const DateElement: React.FC<IElementProps> = ({
  element,
  isSelected,
  onSelect,
  onMouseDown,
  onUpdateProp,
}) => {
  const props = element.properties as IDateProperties
  const commonStyle = getCommonStyle(element, isSelected)

  return (
    <div
      style={commonStyle}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        onMouseDown(e, element.id)
      }}
      className="date-element"
    >
      <input
        type="date"
        value={props.value}
        onChange={(e) => onUpdateProp(element.id, { value: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="date-input"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      />
    </div>
  )
}
