import { useCallback, useEffect, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AvatarCropDialogProps {
  open: boolean
  file: File | null
  onCancel: () => void
  onConfirm: (blob: Blob) => void
  isUploading?: boolean
}

const OUTPUT_SIZE = 512

export function AvatarCropDialog({
  open,
  file,
  onCancel,
  onConfirm,
  isUploading,
}: AvatarCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  useEffect(() => {
    if (!file) {
      setImageSrc(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    const blob = await cropImageToBlob(imageSrc, croppedAreaPixels, rotation)
    if (blob) onConfirm(blob)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Обрезка фото</DialogTitle>
        </DialogHeader>

        <div className="relative h-80 w-full bg-muted rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs text-muted-foreground">Масштаб</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Поворот</label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isUploading}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={isUploading || !croppedAreaPixels}>
            {isUploading ? "Загрузка..." : "Применить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

async function cropImageToBlob(
  imageSrc: string,
  pixels: Area,
  rotation: number,
): Promise<Blob | null> {
  const image = await loadImage(imageSrc)
  const rotRad = (rotation * Math.PI) / 180

  // Canvas large enough to fit the rotated image, then we re-extract the crop
  const { width: bBoxW, height: bBoxH } = rotatedBBox(image.width, image.height, rotRad)
  const rotated = document.createElement("canvas")
  rotated.width = bBoxW
  rotated.height = bBoxH
  const rctx = rotated.getContext("2d")
  if (!rctx) return null
  rctx.translate(bBoxW / 2, bBoxH / 2)
  rctx.rotate(rotRad)
  rctx.drawImage(image, -image.width / 2, -image.height / 2)

  // Extract the crop region and rescale to OUTPUT_SIZE
  const out = document.createElement("canvas")
  out.width = OUTPUT_SIZE
  out.height = OUTPUT_SIZE
  const octx = out.getContext("2d")
  if (!octx) return null
  octx.drawImage(
    rotated,
    pixels.x,
    pixels.y,
    pixels.width,
    pixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )

  return new Promise((resolve) => {
    out.toBlob((blob) => resolve(blob), "image/jpeg", 0.9)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener("load", () => resolve(img))
    img.addEventListener("error", (e) => reject(e))
    img.src = src
  })
}

function rotatedBBox(w: number, h: number, rotRad: number) {
  const sin = Math.abs(Math.sin(rotRad))
  const cos = Math.abs(Math.cos(rotRad))
  return {
    width: w * cos + h * sin,
    height: w * sin + h * cos,
  }
}
