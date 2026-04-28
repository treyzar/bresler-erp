import React from "react"
import type { IEditorElement } from "../../utils/types/editor.types"
import { TextElement } from "./elements/TextElement"
import { ImageElement } from "./elements/ImageElement"
import { TableElement } from "./elements/TableElement"
import { DateElement } from "./elements/DateElement"
import { SignatureElement } from "./elements/SignatureElement"
import { DividerElement } from "./elements/DividerElement"

interface IElementRendererProps {
  element: IEditorElement
  isSelected: boolean
  onSelect: () => void
  onMouseDown: (e: React.MouseEvent, id: string, handle?: string) => void
  onUpdateProp: (id: string, props: Record<string, unknown>) => void
  onEditSignature?: (id: string) => void
}

/**
 * Dispatches each element type to its dedicated component. Each child component
 * owns its own hooks (state, refs, effects) — keeping hook order stable across
 * renders even when an element's `type` changes.
 */
export const ElementRenderer: React.FC<IElementRendererProps> = (props) => {
  switch (props.element.type) {
    case "text":
      return <TextElement {...props} />
    case "image":
      return <ImageElement {...props} />
    case "table":
      return <TableElement {...props} />
    case "date":
      return <DateElement {...props} />
    case "signature":
      return <SignatureElement {...props} />
    case "divider":
      return <DividerElement {...props} />
    default:
      return null
  }
}
