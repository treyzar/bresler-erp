import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"
import { Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Минимальный canvas-pad для рисованной подписи.
 *
 * Работает с мышью и тач-событиями (Pointer Events), чтобы покрыть
 * планшеты/сенсорные экраны без отдельных handler'ов. Резкий чёткий штрих
 * по Catmull-Rom-сглаживанию не делаем — для подписи достаточно простого
 * `lineTo` + `lineCap="round"`.
 *
 * Внешний код получает текущее изображение через ref.toDataURL() или через
 * `onChange(dataURL | null)` callback на каждом stroke-end.
 */

export interface SignaturePadHandle {
  /** Текущее изображение в формате data:image/png;base64,... или null если пусто. */
  toDataURL: () => string | null
  clear: () => void
  isEmpty: () => boolean
}

interface SignaturePadProps {
  width?: number
  height?: number
  onChange?: (dataUrl: string | null) => void
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { width = 500, height = 160, onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [hasContent, setHasContent] = useState(false)

  const getCtx = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext("2d")
  }

  // Настройки кисти при первом маунте + при ресайзе DPR.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2
    ctx.strokeStyle = "#1f2937"
  }, [width, height])

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const begin = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = toLocal(e)
    drawing.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = toLocal(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    setHasContent(true)
    const url = canvasRef.current?.toDataURL("image/png") ?? null
    onChange?.(url)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasContent(false)
    onChange?.(null)
  }

  useImperativeHandle(ref, () => ({
    toDataURL: () => (hasContent ? canvasRef.current?.toDataURL("image/png") ?? null : null),
    clear,
    isEmpty: () => !hasContent,
  }))

  return (
    <div className="space-y-2">
      <div className="border rounded-md bg-background overflow-hidden inline-block">
        <canvas
          ref={canvasRef}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className="touch-none cursor-crosshair block"
          style={{ width, height }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {hasContent ? "Подпись поставлена" : "Распишитесь мышью или пальцем"}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasContent}>
          <Eraser className="mr-2 h-3.5 w-3.5" />
          Очистить
        </Button>
      </div>
    </div>
  )
})
