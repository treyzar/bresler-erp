import type { IEditorElement } from "../../../utils/types/editor.types"

/** Default container style shared by most element types. */
export function getCommonStyle(
  element: IEditorElement,
  isSelected: boolean,
  isEditing: boolean = false,
): React.CSSProperties {
  return {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    border: isSelected ? "2px dashed #3b82f6" : "1px dashed hsl(var(--border))",
    cursor: isEditing ? "text" : "move",
    transition: "border-color 0.15s ease",
    boxSizing: "border-box",
    zIndex: element.zIndex ?? 0,
    boxShadow: isSelected ? "0 0 0 3px rgba(59, 130, 246, 0.25)" : "none",
  }
}

/** Open a file picker, read first selected image, invoke callback with File + dataURL. */
export function createFileInputAndRead(
  callback: (file: File, dataUrl: string) => void,
): void {
  const inp = document.createElement("input")
  inp.type = "file"
  inp.accept = "image/*"
  inp.onchange = () => {
    const f = inp.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      callback(f, src)
    }
    reader.readAsDataURL(f)
  }
  inp.click()
}
