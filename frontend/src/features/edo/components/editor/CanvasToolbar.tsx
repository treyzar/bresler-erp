import React from "react";
import {
  Undo2,
  Redo2,
  Trash2,
  FileDown,
  File,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  currentPage,
  totalPages,
  onPageChange,
}) => (
  <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border bg-background/80 p-2">
    <div className="flex items-center gap-2 rounded-lg bg-muted/70 p-1">
      <Button
        variant="ghost"
        onClick={onUndo}
        disabled={!canUndo}
        title="Отменить (Ctrl+Z)"
        size="sm"
        className="h-8"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        onClick={onRedo}
        disabled={!canRedo}
        title="Повторить (Ctrl+Y)"
        size="sm"
        className="h-8"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>

    {totalPages > 1 && (
      <div className="mx-auto flex items-center gap-1 rounded-lg border bg-card px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          disabled={currentPage <= 0}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[116px] text-center text-sm font-medium whitespace-nowrap">
          Страница {currentPage + 1} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )}

    <div className="ml-auto flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={onExportDocx}
        title="Экспорт DOCX"
        size="sm"
        className="h-8"
      >
        <FileDown className="mr-2 h-4 w-4" />
        DOCX
      </Button>
      <Button
        variant="outline"
        onClick={onExportHtml}
        title="Экспорт HTML"
        size="sm"
        className="h-8"
      >
        <File className="mr-2 h-4 w-4" />
        HTML
      </Button>
      <Button
        variant="outline"
        onClick={onExportPdf}
        title="Экспорт PDF"
        size="sm"
        className="h-8"
      >
        <FileText className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button
        variant="ghost"
        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onClear}
        title="Очистить холст"
        size="sm"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Очистить
      </Button>
    </div>
  </div>
);

export default CanvasToolbar;
