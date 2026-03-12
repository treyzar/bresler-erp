import React from "react";
import { Undo2, Redo2, Trash2, FileDown, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExportDocx: () => void;
  onExportHtml: () => void;
  onExportPdf?: () => void;
  gridVisible: boolean;
  gridStep: number;
  onToggleGrid: (v: boolean) => void;
  onGridStepChange: (s: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const CanvasToolbar: React.FC<Props> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExportDocx,
  onExportHtml,
  onExportPdf,
  gridVisible,
  gridStep,
  onToggleGrid,
  onGridStepChange,
  currentPage,
  totalPages,
  onPageChange,
}) => (
  <div className="flex items-center justify-between w-full">
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={onUndo}
        disabled={!canUndo}
        title="Отменить (Ctrl+Z)"
        size="sm"
      >
        <Undo2 className="h-4 w-4 mr-2" />
        Отменить
      </Button>
      <Button
        variant="outline"
        onClick={onRedo}
        disabled={!canRedo}
        title="Повторить (Ctrl+Y)"
        size="sm"
      >
        <Redo2 className="h-4 w-4 mr-2" />
        Повторить
      </Button>
    </div>
    
    <div className="flex gap-2 items-center flex-1 justify-center">
      {totalPages > 1 && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-md p-1 border">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={currentPage <= 0}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ←
          </Button>
          <span className="text-sm font-medium px-2 whitespace-nowrap">
            Стр. {currentPage + 1} из {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={currentPage >= totalPages - 1}
            onClick={() => onPageChange(currentPage + 1)}
          >
            →
          </Button>
        </div>
      )}
    </div>

    <div className="flex gap-2 items-center">
      <div className="flex items-center gap-2 border-r pr-3 mr-1">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            checked={gridVisible}
            onChange={(e) => onToggleGrid(e.target.checked)}
          />
          Сетка
        </label>
        <select
          className="h-8 w-[80px] rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={gridStep}
          onChange={(e) => onGridStepChange(parseInt(e.target.value))}
        >
          <option value={8}>8px</option>
          <option value={10}>10px</option>
          <option value={16}>16px</option>
          <option value={20}>20px</option>
          <option value={24}>24px</option>
          <option value={32}>32px</option>
        </select>
      </div>

      <Button
        variant="ghost"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onClear}
        title="Очистить холст"
        size="sm"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Очистить
      </Button>
      <Button
        variant="secondary"
        onClick={onExportDocx}
        title="Экспорт DOCX"
        size="sm"
      >
        <FileDown className="h-4 w-4 mr-2" />
        DOCX
      </Button>
      <Button
        variant="secondary"
        onClick={onExportHtml}
        title="Экспорт HTML"
        size="sm"
      >
        <File className="h-4 w-4 mr-2" />
        HTML
      </Button>
      <Button
        variant="secondary"
        onClick={onExportPdf}
        title="Экспорт PDF"
        size="sm"
      >
        <FileDown className="h-4 w-4 mr-2" />
        PDF
      </Button>
    </div>
  </div>
);

export default CanvasToolbar;
