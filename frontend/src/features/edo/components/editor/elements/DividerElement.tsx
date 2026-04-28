import React from "react"
import type { IDividerProperties } from "../../../utils/types/editor.types"
import { getCommonStyle } from "./helpers"
import type { IElementProps } from "./types"

export const DividerElement: React.FC<IElementProps> = ({
  element,
  isSelected,
  onSelect,
  onMouseDown,
}) => {
  const props = element.properties as IDividerProperties
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
      className="divider-element"
    >
      <div
        style={{
          borderTop: `${props.thickness}px ${props.style} ${props.color}`,
          width: "100%",
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
    </div>
  )
}
