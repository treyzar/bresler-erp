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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TElementType } from "../../utils/types/editor.types";

interface Props {
  onAdd: (t: TElementType) => void;
  onImageUpload: (f: File) => void;
  gridVisible: boolean;
  onToggleGrid: (v: boolean) => void;
  zoom: number;
  autoZoom: number;
  isManualZoom: boolean;
  onZoomChange: (z: number, manual: boolean) => void;
}

const buttons: { type: TElementType; icon: React.ReactNode; label: string }[] =
  [
    { type: "text", icon: <FileText size={20} />, label: "Текст" },
    { type: "image", icon: <ImageIcon size={20} />, label: "Картинка" },
    { type: "table", icon: <TableIcon size={20} />, label: "Таблица" },
    { type: "signature", icon: <PenTool size={20} />, label: "Подпись" },
    { type: "divider", icon: <Minus size={20} />, label: "Линия" },
  ];

const ElementsPanel: React.FC<Props> = ({
  onAdd,
  onImageUpload,
  gridVisible,
  onToggleGrid,
  zoom,
  autoZoom,
  isManualZoom,
  onZoomChange,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  // Текущий отображаемый зум
  const displayZoom = zoom;
  const zoomPercent = Math.round(displayZoom * 100);

  // Пресеты масштаба
  const zoomPresets = [0.5, 0.75, 1, 1.25, 1.5];

  // Обработчик изменения зума через слайдер
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onZoomChange(value, true); // true = manual
  };

  // Обработчик пресетов
  const handlePresetClick = (preset: number) => {
    onZoomChange(preset, true);
  };

  // Сброс зума
  const handleResetZoom = () => {
    onZoomChange(autoZoom, false); // false = auto mode
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Секция добавления элементов */}
      <div className="pb-4 border-b">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Plus size={14} />
          Добавить элемент
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {buttons.map((b) => (
            <Button
              key={b.type}
              variant="outline"
              className="flex flex-col items-center justify-center gap-2 h-auto py-4 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors duration-200"
              onClick={() => onAdd(b.type)}
              title={`Добавить ${b.label}`}
            >
              <div className="text-primary">{b.icon}</div>
              <span className="text-xs font-medium">{b.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Загрузка изображения */}
      <div className="pb-4 border-b">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Upload size={14} />
          Загрузка
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
          className="w-full flex items-center justify-center gap-2"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} />
          Загрузить изображение
        </Button>
      </div>

      {/* Секция масштаба */}
      <div className="bg-muted -mx-4 p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0">
            <ZoomIn size={14} />
            Масштаб
          </h4>
          <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-md min-w-[60px] text-center">
            {zoomPercent}%
          </span>
        </div>

        {/* Слайдер */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] text-muted-foreground min-w-[28px]">50%</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={displayZoom}
            onChange={handleSliderChange}
            className="flex-1 h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-primary"
          />
          <span className="text-[10px] text-muted-foreground min-w-[28px] text-right">200%</span>
        </div>

        {/* Пресеты */}
        <div className="flex gap-1.5 mb-3">
          {zoomPresets.map((preset) => (
            <Button
              key={preset}
              variant={Math.abs(displayZoom - preset) < 0.03 ? "default" : "outline"}
              size="sm"
              className="flex-1 h-7 text-[10px] font-semibold px-1 min-w-0"
              onClick={() => handlePresetClick(preset)}
            >
              {Math.round(preset * 100)}%
            </Button>
          ))}
        </div>

        {/* Кнопка сброса */}
        {isManualZoom && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
            onClick={handleResetZoom}
          >
            <RotateCcw size={14} className="mr-2" />
            Сбросить (Авто: {Math.round(autoZoom * 100)}%)
          </Button>
        )}
      </div>

      {/* Сетка */}
      <div className="pb-4">
        <label className="flex items-center gap-3 cursor-pointer text-sm py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
          <input
            type="checkbox"
            className="w-[18px] h-[18px] accent-primary cursor-pointer rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            checked={gridVisible}
            onChange={(e) => onToggleGrid(e.target.checked)}
          />
          <Grid size={14} className="text-muted-foreground" />
          <span className="font-medium text-foreground">Показать сетку</span>
        </label>
      </div>
    </div>
  );
};

export default ElementsPanel;
