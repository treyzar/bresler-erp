// src/utils/types/editor.types.ts

/* ===== TYPE-ALIASES ===== */
export type TTemplateType = "HTML" | "DOCX" | "PDF";
export type TVisibilityType = "PUBLIC" | "RESTRICTED";
export type TElementType =
  | "text"
  | "image"
  | "table"
  | "date"
  | "signature"
  | "divider";
export type TAlignType = "left" | "center" | "right" | "justify";
export type TDividerStyle = "solid" | "dashed" | "dotted";
export type TWhiteSpace = "normal" | "nowrap" | "pre-wrap" | "pre-line";
export type TWordBreak = "normal" | "break-all" | "break-word" | "keep-all";
export type TDocSection =
  | "hotkeys"
  | "elements"
  | "work"
  | "tables"
  | "export"
  | "copy";

/* ===== INTERFACES ===== */
export interface ITextProperties {
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TAlignType;
  // НОВЫЕ СВОЙСТВА
  textIndent: number; // Красная строка (px)
  lineHeight: number; // Межстрочный интервал (множитель)
  letterSpacing: number; // Межбуквенный интервал (px)
  whiteSpace: TWhiteSpace; // Режим переноса
  wordBreak: TWordBreak; // Перенос слов
  paragraphSpacing: number; // Отступ между абзацами (px)
}

export interface IImageProperties {
  src: string;
  alt: string;
  file?: File;
}

export interface ITableProperties {
  rows: number;
  cols: number;
  borderWidth: number;
  borderColor: string;
  cellBg: string;
  data: string[][];
  cellTextColors?: string[][]; // Цвета текста для каждой ячейки [row][col]
}

export interface IDateProperties {
  format: string;
  value: string;
}

export interface ISignatureProperties {
  text: string;
  fontSize: number;
  color: string;
  image?: string;
}

export interface IDividerProperties {
  thickness: number;
  color: string;
  style: TDividerStyle;
}

export type TElementProperties =
  | ITextProperties
  | IImageProperties
  | ITableProperties
  | IDateProperties
  | ISignatureProperties
  | IDividerProperties;

export interface IEditorElement {
  id: string;
  type: TElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  properties: TElementProperties;
}

export interface IHistoryState {
  elements: IEditorElement[];
  timestamp: number;
}

/* ===== пропсы компонентов ===== */
export interface ICanvasProps {
  elements: IEditorElement[];
  selectedId: string | null;
  gridVisible: boolean;
  zoom: number;
  onSelect: (id: string | null) => void;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onUpdateProp: (id: string, p: Partial<TElementProperties>) => void;
}
