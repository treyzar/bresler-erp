import React, { useRef } from "react"
import type { ISignatureProperties } from "../../../utils/types/editor.types"
import { getCommonStyle } from "./helpers"
import type { IElementProps } from "./types"

interface ISignatureElementProps extends IElementProps {
  onEditSignature?: (id: string) => void
}

export const SignatureElement: React.FC<ISignatureElementProps> = ({
  element,
  isSelected,
  onSelect,
  onMouseDown,
  onUpdateProp,
  onEditSignature,
}) => {
  const props = element.properties as ISignatureProperties & { image?: string }
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const commonStyle = getCommonStyle(element, isSelected)

  const start = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canvasRef.current) return
    drawing.current = true
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width || 1
    const scaleY = canvasRef.current.height / rect.height || 1
    last.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const move = (e: React.MouseEvent) => {
    if (!drawing.current || !canvasRef.current || !last.current) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width || 1
    const scaleY = canvasRef.current.height / rect.height || 1
    const nx = (e.clientX - rect.left) * scaleX
    const ny = (e.clientY - rect.top) * scaleY
    ctx.strokeStyle = props.color || "#000"
    ctx.lineWidth = Math.max(1, 2 * ((scaleX + scaleY) / 2))
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(nx, ny)
    ctx.stroke()
    last.current = { x: nx, y: ny }
  }

  const end = () => {
    if (!canvasRef.current) return
    drawing.current = false
    last.current = null
    const orig = canvasRef.current
    const tmp = document.createElement("canvas")
    tmp.width = orig.width
    tmp.height = orig.height
    const tctx = tmp.getContext("2d")
    if (tctx) tctx.drawImage(orig, 0, 0)
    const data = tmp.toDataURL("image/png")
    onUpdateProp(element.id, { image: data })
  }

  // Click on the canvas itself shouldn't bubble — drawing takes priority over selection.
  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "CANVAS") {
      e.stopPropagation()
      return
    }
    e.stopPropagation()
    onSelect()
  }

  return (
    <div
      style={commonStyle}
      onClick={handleContainerClick}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEditSignature?.(element.id)
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        onMouseDown(e, element.id)
      }}
      className="signature-element"
    >
      {props.image ? (
        <img
          src={props.image}
          alt="Signature"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          draggable={false}
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={Math.max(200, element.width)}
          height={Math.max(60, element.height)}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
            cursor: isSelected ? "crosshair" : "pointer",
            touchAction: "none",
          }}
        />
      )}
    </div>
  )
}
