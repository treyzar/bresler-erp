import React, { useRef } from "react";
import {
  FileText,
  Image as ImageIcon,
  Table as TableIcon,
  PenTool,
  Minus,
  Upload,
  Plus,
  ZoomIn,
  RotateCcw,
  Grid,
  Magnet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TElementType } from "../../utils/types/editor.types";

interface Props {
  onAdd: (t: TElementType) => void;
  onImageUpload: (f: File) => void;
  gridVisible: boolean;
  gridSnap: boolean;
  onToggleGrid: (v: boolean) => void;
  onToggleSnap: (v: boolean) => void;
  zoom: number;
  autoZoom: number;
  isManualZoom: boolean;
  onZoomChange: (z: number, manual: boolean) => void;
}

const buttons: { type: TElementType; icon: React.ReactNode; label: string }[] = [
  { type: "text", icon: <FileText size={18} />, label: "Текст" },
  { type: "image", icon: <ImageIcon size={18} />, label: "Картинка" },
  { type: "table", icon: <TableIcon size={18} />, label: "Таблица" },
  { type: "signature", icon: <PenTool size={18} />, label: "Подпись" },
  { type: "divider", icon: <Minus size={18} />, label: "Линия" },
];

const ElementsPanel: React.FC<Props> = ({
  onAdd,
  onImageUpload,
  gridVisible,
  gridSnap,
  onToggleGrid,
  onToggleSnap,
  zoom,
  autoZoom,
  isManualZoom,
  onZoomChange,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const zoomPercent = Math.round(zoom * 100);
  const zoomPresets = [0.5, 0.75, 1, 1.25, 1.5];

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border bg-card/70 p-3">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Plus size={14} />
          Библиотека блоков
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {buttons.map((b) => (
            <Button
              key={b.type}
              variant="outline"
              className="h-auto min-h-[70px] flex-col gap-2 rounded-lg border-dashed"
              onClick={() => onAdd(b.type)}
              title={`Добавить ${b.label}`}
            >
              <span className="text-primary">{b.icon}</span>
              <span className="text-xs font-medium">{b.label}</span>
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card/70 p-3">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Upload size={14} />
          Импорт
        </h4>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onImageUpload(e.target.files[0]);
              e.target.value = "";
            }
          }}
        />
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} className="mr-2" />
          Загрузить изображение
        </Button>
      </section>

      <section className="rounded-xl border bg-card/70 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ZoomIn size={14} />
            Масштаб
          </h4>
          <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {zoomPercent}%
          </span>
        </div>

        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value), true)}
          className="mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-input accent-primary"
        />

        <div className="mb-3 grid grid-cols-5 gap-1">
          {zoomPresets.map((preset) => (
            <Button
              key={preset}
              variant={Math.abs(zoom - preset) < 0.03 ? "default" : "outline"}
              size="sm"
              className="h-7 px-1 text-[10px]"
              onClick={() => onZoomChange(preset, true)}
            >
              {Math.round(preset * 100)}%
            </Button>
          ))}
        </div>

        {isManualZoom && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => onZoomChange(autoZoom, false)}
          >
            <RotateCcw size={14} className="mr-2" />
            Автомасштаб ({Math.round(autoZoom * 100)}%)
          </Button>
        )}
      </section>

      <section className="rounded-xl border bg-card/70 p-3">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Точность
        </h4>
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3 rounded-md border px-2 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Grid size={14} className="text-muted-foreground" />
              Показать сетку
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={gridVisible}
              onChange={(e) => onToggleGrid(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-md border px-2 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Magnet size={14} className="text-muted-foreground" />
              Привязка к сетке
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={gridSnap}
              onChange={(e) => onToggleSnap(e.target.checked)}
            />
          </label>
        </div>
      </section>
    </div>
  );
};

export default ElementsPanel;
