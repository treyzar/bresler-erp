import type { IEditorElement } from "../../../utils/types/editor.types"

/** Props every element-type component receives from ElementRenderer. */
export interface IElementProps {
  element: IEditorElement
  isSelected: boolean
  onSelect: () => void
  onMouseDown: (e: React.MouseEvent, id: string, handle?: string) => void
  onUpdateProp: (id: string, props: Record<string, unknown>) => void
}
