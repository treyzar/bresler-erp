// src/components/editor/PropertiesPanel.tsx

import React, { useState, useEffect } from "react";
import {
  Type,
  Palette,
  TableIcon,
  Signature,
  Minus,
  ArrowDown,
  ArrowUp,
  Trash2,
  Copy,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  IndentIncrease,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import type {
  IEditorElement,
  ITextProperties,
  IImageProperties,
  ITableProperties,
  ISignatureProperties,
  IDividerProperties,
  ICellStyle,
  ITableCell,
  ITableColumn,
} from "../../utils/types/editor.types";

interface Props {
  selected: IEditorElement | null;
  onUpdateEl: (id: string, upd: Partial<IEditorElement>) => void;
  onUpdateProps: (id: string, p: any) => void;
  onDelete: (id: string) => void;
  onMoveLayer: (id: string, d: "front" | "back") => void;
  onEditSignature?: (id: string) => void;
}

const PropertiesPanel: React.FC<Props> = ({
  selected,
  onUpdateEl,
  onUpdateProps,
  onDelete,
  onMoveLayer,
  onEditSignature,
}) => {
  const [tempValues, setTempValues] = useState<{
    x?: string;
    y?: string;
    width?: string;
    height?: string;
  }>({});

  useEffect(() => {
    setTempValues({});
  }, [selected?.id]);

  if (!selected)
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground opacity-70">
        <div className="bg-muted p-4 rounded-full mb-4">
          <Type size={32} />
        </div>
        <h3 className="font-medium text-foreground mb-2">Выберите элемент</h3>
        <p className="text-sm">
          Нажмите на любой элемент на холсте, чтобы настроить его свойства
        </p>
      </div>
    );

  const handleNumberInput = (
    field: "x" | "y" | "width" | "height",
    value: string,
  ) => {
    setTempValues((prev) => ({ ...prev, [field]: value }));

    if (value === "" || isNaN(Number(value))) {
      return;
    }

    const numValue = Number(value);
    let constrainedValue = numValue;

    if (field === "width") {
      constrainedValue = Math.max(50, Math.min(numValue, 794));
    } else if (field === "height") {
      constrainedValue = Math.max(30, Math.min(numValue, 1123));
    } else if (field === "x") {
      constrainedValue = Math.max(0, Math.min(numValue, 794 - selected.width));
    } else if (field === "y") {
      constrainedValue = Math.max(
        0,
        Math.min(numValue, 1123 - selected.height),
      );
    }

    onUpdateEl(selected.id, { [field]: constrainedValue });
  };

  const handleBlur = (field: "x" | "y" | "width" | "height") => {
    if (tempValues[field] === "" || tempValues[field] === undefined) {
      setTempValues((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const getDisplayValue = (field: "x" | "y" | "width" | "height") => {
    if (tempValues[field] !== undefined) {
      return tempValues[field];
    }
    return selected[field].toString();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Позиция и размер */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Позиция X</Label>
            <Input
              type="number"
              className="h-8 shadow-none"
              value={getDisplayValue("x")}
              onChange={(e) => handleNumberInput("x", e.target.value)}
              onBlur={() => handleBlur("x")}
              min="0"
              max="794"
              step="1"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Позиция Y</Label>
            <Input
              type="number"
              className="h-8 shadow-none"
              value={getDisplayValue("y")}
              onChange={(e) => handleNumberInput("y", e.target.value)}
              onBlur={() => handleBlur("y")}
              min="0"
              max="1123"
              step="1"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ширина</Label>
            <Input
              type="number"
              className="h-8 shadow-none"
              value={getDisplayValue("width")}
              onChange={(e) => handleNumberInput("width", e.target.value)}
              onBlur={() => handleBlur("width")}
              min="50"
              max="794"
              step="1"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Высота</Label>
            <Input
              type="number"
              className="h-8 shadow-none"
              value={getDisplayValue("height")}
              onChange={(e) => handleNumberInput("height", e.target.value)}
              onBlur={() => handleBlur("height")}
              min="30"
              max="1123"
              step="1"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-5">
        {selected.type === "text" && (
          <TextProps el={selected} onUpdate={onUpdateProps} />
        )}
        {selected.type === "image" && (
          <ImageProps el={selected} onUpdate={onUpdateProps} />
        )}
        {selected.type === "table" && (
          <TableProps el={selected} onUpdate={onUpdateProps} />
        )}
        {selected.type === "signature" && (
          <SignatureProps
            el={selected}
            onUpdate={onUpdateProps}
            onEdit={onEditSignature}
          />
        )}
        {selected.type === "divider" && (
          <DividerProps el={selected} onUpdate={onUpdateProps} />
        )}
      </div>

      <Separator />

      {/* Действия */}
      <div className="space-y-2 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onMoveLayer(selected.id, "back")}
          >
            <ArrowDown className="mr-2 h-3.5 w-3.5" />
            На задний план
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onMoveLayer(selected.id, "front")}
          >
            <ArrowUp className="mr-2 h-3.5 w-3.5" />
            На передний
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(selected.id)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Удалить
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              navigator.clipboard
                .writeText(JSON.stringify(selected))
                .then(() => alert("Элемент скопирован!"))
            }
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Копировать
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ========== TEXT PROPS (ОБНОВЛЁННЫЙ) ========== */
const TextProps: React.FC<{
  el: IEditorElement;
  onUpdate: (id: string, p: any) => void;
}> = ({ el, onUpdate }) => {
  const p = el.properties as ITextProperties;
  const [tempFontSize, setTempFontSize] = useState<string | undefined>();

  const handleFontSizeChange = (value: string) => {
    setTempFontSize(value);
    if (value === "" || isNaN(Number(value))) return;
    const numValue = Math.max(8, Math.min(Number(value), 72));
    onUpdate(el.id, { fontSize: numValue });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Текст (textarea для многострочного ввода) */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Type size={14} />
          Текст
        </Label>
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
          rows={4}
          value={p.content}
          onChange={(e) => onUpdate(el.id, { content: e.target.value })}
          placeholder="Введите текст...&#10;Используйте Enter для новой строки"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Enter — новый абзац, Shift+Enter — перенос строки
        </p>
      </div>

      {/* Шрифт */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Шрифт</Label>
        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={p.fontFamily}
          onChange={(e) => onUpdate(el.id, { fontFamily: e.target.value })}
        >
          <option>Inter</option>
          <option>Arial</option>
          <option>Times New Roman</option>
          <option>Courier New</option>
          <option>Georgia</option>
          <option>Verdana</option>
        </select>
      </div>

      {/* Размер шрифта */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Размер шрифта: {p.fontSize}px</Label>
        <div className="flex gap-3 items-center">
          <input
            type="range"
            min="8"
            max="72"
            value={p.fontSize}
            onChange={(e) =>
              onUpdate(el.id, { fontSize: parseInt(e.target.value) })
            }
            className="flex-1 h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-primary"
          />
          <Input
            type="number"
            className="w-16 h-8 text-center shadow-none"
            value={tempFontSize ?? p.fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            onBlur={() => setTempFontSize(undefined)}
            min="8"
            max="72"
          />
        </div>
      </div>

      {/* Цвет */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Palette size={14} />
          Цвет текста
        </Label>
        <input
          type="color"
          className="w-full h-8 rounded cursor-pointer border-0 p-0"
          value={p.color}
          onChange={(e) => onUpdate(el.id, { color: e.target.value })}
        />
      </div>

      {/* Стили текста */}
      <div className="space-y-2.5">
        <Label className="text-xs text-muted-foreground">Стиль текста</Label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded-md -ml-1.5 transition-colors">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 h-[18px] w-[18px]"
              checked={p.bold}
              onChange={(e) => onUpdate(el.id, { bold: e.target.checked })}
            />
            <span className="font-semibold">Жирный</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded-md -ml-1.5 transition-colors">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 h-[18px] w-[18px]"
              checked={p.italic}
              onChange={(e) => onUpdate(el.id, { italic: e.target.checked })}
            />
            <span className="italic">Курсив</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded-md -ml-1.5 transition-colors col-span-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 h-[18px] w-[18px]"
              checked={p.underline}
              onChange={(e) => onUpdate(el.id, { underline: e.target.checked })}
            />
            <span className="underline">Подчёркнутый</span>
          </label>
        </div>
      </div>

      {/* Выравнивание */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Выравнивание</Label>
        <div className="flex gap-1.5">
          {(["left", "center", "right", "justify"] as const).map((align) => (
            <Button
              key={align}
              type="button"
              variant={p.align === align ? "default" : "outline"}
              className="flex-1 px-0 shadow-none h-8"
              onClick={() => onUpdate(el.id, { align })}
              title={
                align === "left"
                  ? "По левому краю"
                  : align === "center"
                    ? "По центру"
                    : align === "right"
                      ? "По правому краю"
                      : "По ширине"
              }
            >
              {align === "left" && <AlignLeft size={16} />}
              {align === "center" && <AlignCenter size={16} />}
              {align === "right" && <AlignRight size={16} />}
              {align === "justify" && <AlignJustify size={16} />}
            </Button>
          ))}
        </div>
      </div>

      {/* === НОВЫЙ РАЗДЕЛ: Параграф === */}
      <div className="pt-3 border-t">
        <Label className="flex items-center gap-2 font-semibold text-sm mb-4">
          <IndentIncrease size={16} className="text-muted-foreground" />
          Абзац
        </Label>
        
        <div className="space-y-5">
          {/* Красная строка */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Красная строка: {p.textIndent || 0}px</Label>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={p.textIndent || 0}
              onChange={(e) =>
                onUpdate(el.id, { textIndent: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex gap-1.5 mt-2">
              <Button
                size="sm"
                variant={(p.textIndent || 0) === 0 ? "default" : "outline"}
                className="flex-1 h-7 text-[10px] shadow-none"
                onClick={() => onUpdate(el.id, { textIndent: 0 })}
              >
                Нет
              </Button>
              <Button
                size="sm"
                variant={p.textIndent === 25 ? "default" : "outline"}
                className="flex-1 h-7 text-[10px] shadow-none"
                onClick={() => onUpdate(el.id, { textIndent: 25 })}
              >
                25px
              </Button>
              <Button
                size="sm"
                variant={p.textIndent === 40 ? "default" : "outline"}
                className="flex-1 h-7 text-[10px] shadow-none"
                onClick={() => onUpdate(el.id, { textIndent: 40 })}
              >
                40px
              </Button>
              <Button
                size="sm"
                variant={p.textIndent === 60 ? "default" : "outline"}
                className="flex-1 h-7 text-[10px] shadow-none"
                onClick={() => onUpdate(el.id, { textIndent: 60 })}
              >
                60px
              </Button>
            </div>
          </div>

          {/* Межстрочный интервал */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Межстрочный интервал: {(p.lineHeight || 1.5).toFixed(1)}
            </Label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={p.lineHeight || 1.5}
              onChange={(e) =>
                onUpdate(el.id, { lineHeight: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex gap-1.5 mt-2">
              <Button
                size="sm"
                variant={(p.lineHeight || 1.5) === 1 ? "default" : "outline"}
                className="flex-1 h-7 text-[10px] px-1 shadow-none"
                onClick={() => onUpdate(el.id, { lineHeight: 1 })}
              >
                1.0
              </Button>
              <Button
                size="sm"
                variant={(p.lineHeight || 1.5) === 1.5 ? "default" : "outline"}
                className="flex-1 h-7 text-[10px] px-1 shadow-none"
                onClick={() => onUpdate(el.id, { lineHeight: 1.5 })}
              >
                1.5
              </Button>
              <Button
                size="sm"
                variant={(p.lineHeight || 1.5) === 2 ? "default" : "outline"}
                className="flex-1 h-7 text-[10px] px-1 shadow-none"
                onClick={() => onUpdate(el.id, { lineHeight: 2 })}
              >
                2.0
              </Button>
            </div>
          </div>

          {/* Отступ между абзацами */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Отступ между абзацами: {p.paragraphSpacing || 0}px
            </Label>
            <input
              type="range"
              min="0"
              max="40"
              step="2"
              value={p.paragraphSpacing || 0}
              onChange={(e) =>
                onUpdate(el.id, { paragraphSpacing: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-3 border-t">
        {/* Перенос текста */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Перенос пробелов</Label>
          <select
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={p.whiteSpace || "pre-wrap"}
            onChange={(e) => onUpdate(el.id, { whiteSpace: e.target.value })}
          >
            <option value="pre-wrap">Сохранять переносы (pre-wrap)</option>
            <option value="normal">Схлопывать (normal)</option>
            <option value="nowrap">Без переноса (nowrap)</option>
            <option value="pre-line">Только переносы (pre-line)</option>
          </select>
        </div>

        {/* Перенос слов */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Перенос длинных слов</Label>
          <select
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={p.wordBreak || "break-word"}
            onChange={(e) => onUpdate(el.id, { wordBreak: e.target.value })}
          >
            <option value="normal">Обычный (normal)</option>
            <option value="break-word">По словам (break-word)</option>
            <option value="break-all">По символам (break-all)</option>
            <option value="keep-all">Не разрывать (keep-all)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

/* ========== Остальные компоненты ========== */

const ImageProps: React.FC<{
  el: IEditorElement;
  onUpdate: (id: string, p: any) => void;
}> = ({ el, onUpdate }) => {
  const p = el.properties as IImageProperties;
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Upload size={14} />
        URL изображения
      </Label>
      <Input
        type="text"
        className="h-8 shadow-none"
        value={p.src}
        onChange={(e) => onUpdate(el.id, { src: e.target.value })}
        placeholder="https://example.com/image.jpg"
      />
      <p className="text-[11px] text-muted-foreground mt-1">Поддерживаются URL или data URI</p>
    </div>
  );
};

const TableProps: React.FC<{
  el: IEditorElement;
  onUpdate: (id: string, p: any) => void;
}> = ({ el, onUpdate }) => {
  const p = el.properties as ITableProperties;
  const isNew = !!(p.cells && p.columns);
  const [selectedRow, setSelectedRow] = React.useState(0);
  const [selectedCol, setSelectedCol] = React.useState(0);

  const currentCell = isNew ? p.cells?.[selectedRow]?.[selectedCol] : null;
  const currentStyle = currentCell?.style || {};

  const updateCellStyle = (styleUpd: Partial<ICellStyle>) => {
    if (!isNew || !p.cells) return;
    const newCells = [...p.cells];
    const cell = newCells[selectedRow][selectedCol];
    if (cell) {
      newCells[selectedRow][selectedCol] = {
        ...cell,
        style: { ...(cell.style || {}), ...styleUpd } as ICellStyle,
      };
      onUpdate(el.id, { cells: newCells });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Общие настройки таблицы */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <TableIcon size={14} />
          Общие границы
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            className="w-16 h-8 text-center shadow-none"
            value={p.borderWidth}
            onChange={(e) =>
              onUpdate(el.id, { borderWidth: parseInt(e.target.value) || 0 })
            }
            min="0"
          />
          <input
            type="color"
            className="flex-1 h-8 rounded cursor-pointer border-0 p-0"
            value={p.borderColor}
            onChange={(e) => onUpdate(el.id, { borderColor: e.target.value })}
          />
        </div>
      </div>

      <Separator />

      {/* Настройки конкретной ячейки */}
      <div className="space-y-4">
        <Label className="text-xs font-semibold">Свойства ячейки</Label>
        <div className="flex gap-2 items-center">
          <select
            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={selectedRow}
            onChange={(e) => setSelectedRow(parseInt(e.target.value))}
          >
            {Array.from({ length: p.rows }).map((_, i) => (
              <option key={i} value={i}>
                Стр. {i + 1}
              </option>
            ))}
          </select>
          <select
            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={selectedCol}
            onChange={(e) => setSelectedCol(parseInt(e.target.value))}
          >
            {Array.from({ length: p.cols }).map((_, i) => (
              <option key={i} value={i}>
                Кол. {i + 1}
              </option>
            ))}
          </select>
        </div>

        {isNew && currentCell && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Фон ячейки</Label>
              <input
                type="color"
                className="w-full h-7 rounded cursor-pointer border-0 p-0"
                value={currentStyle.backgroundColor || p.cellBg}
                onChange={(e) => updateCellStyle({ backgroundColor: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Цвет текста</Label>
              <input
                type="color"
                className="w-full h-7 rounded cursor-pointer border-0 p-0"
                value={currentStyle.color || "#000000"}
                onChange={(e) => updateCellStyle({ color: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Размер</Label>
                <Input
                  type="number"
                  className="h-7 text-xs"
                  value={currentStyle.fontSize || 14}
                  onChange={(e) => updateCellStyle({ fontSize: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Жирный</Label>
                <select
                  className="h-7 w-full rounded-md border border-input bg-transparent px-2 py-0 text-xs shadow-sm"
                  value={currentStyle.fontWeight || "normal"}
                  onChange={(e) => updateCellStyle({ fontWeight: e.target.value as any })}
                >
                  <option value="normal">Нет</option>
                  <option value="bold">Да</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Выравнивание</Label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => (
                  <Button
                    key={a}
                    variant={currentStyle.textAlign === a ? "default" : "outline"}
                    className="flex-1 h-7 px-0"
                    onClick={() => updateCellStyle({ textAlign: a })}
                  >
                    {a === "left" && <AlignLeft size={14} />}
                    {a === "center" && <AlignCenter size={14} />}
                    {a === "right" && <AlignRight size={14} />}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Граница ячейки (px)</Label>
              <Input
                type="number"
                className="h-7 text-xs"
                value={currentStyle.borderWidth ?? p.borderWidth}
                onChange={(e) => updateCellStyle({ borderWidth: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SignatureProps: React.FC<{
  el: IEditorElement;
  onUpdate: (id: string, p: any) => void;
  onEdit?: (id: string) => void;
}> = ({ el, onUpdate, onEdit }) => {
  const p = el.properties as ISignatureProperties & { image?: string };

  const uploadImage = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        onUpdate(el.id, { image: src });
      };
      reader.readAsDataURL(f);
    };
    inp.click();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Signature size={14} />
          Текст подписи
        </Label>
        <Input
          type="text"
          className="h-8 shadow-none"
          value={p.text}
          onChange={(e) => onUpdate(el.id, { text: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Подпись как изображение</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs px-2 shadow-none"
            onClick={() => onUpdate(el.id, { image: "" })}
          >
            Очистить
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs px-2 shadow-none"
            onClick={() => onEdit?.(el.id)}
          >
            Изменить
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs px-2 shadow-none"
            onClick={uploadImage}
          >
            Загрузить
          </Button>
        </div>
      </div>
    </div>
  );
};

const DividerProps: React.FC<{
  el: IEditorElement;
  onUpdate: (id: string, p: any) => void;
}> = ({ el, onUpdate }) => {
  const p = el.properties as IDividerProperties;

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Minus size={14} />
          Толщина
        </Label>
        <div className="flex gap-3 items-center">
          <input
            type="range"
            min="1"
            max="5"
            value={p.thickness}
            onChange={(e) =>
              onUpdate(el.id, { thickness: parseInt(e.target.value) })
            }
            className="flex-1 h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-primary"
          />
          <Input
            type="number"
            className="w-16 h-8 text-center shadow-none"
            value={p.thickness}
            onChange={(e) =>
              onUpdate(el.id, { thickness: parseInt(e.target.value) || 1 })
            }
            min="1"
            max="5"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Стиль линии</Label>
        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={p.style}
          onChange={(e) => onUpdate(el.id, { style: e.target.value })}
        >
          <option value="solid">Сплошная</option>
          <option value="dashed">Пунктирная</option>
          <option value="dotted">Точечная</option>
        </select>
      </div>
    </div>
  );
};

export default PropertiesPanel;
