// src/features/edo/utils/types/tiptap.types.ts
/**
 * Unified JSON Schema for Tiptap/ProseMirror-based editor
 * Compatible with python-docx export logic
 */

/* ===== MARKS (форматирование текста) ===== */
export type TiptapMarkType = 'bold' | 'italic' | 'underline' | 'textStyle' | 'link';

export interface TiptapMark {
  type: TiptapMarkType;
  attrs?: {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    href?: string;
  };
}

/* ===== NODE TYPES ===== */
export type TiptapNodeType =
  | 'doc'
  | 'paragraph'
  | 'heading'
  | 'text'
  | 'image'
  | 'table'
  | 'tableRow'
  | 'tableCell'
  | 'tableHeader'
  | 'bulletList'
  | 'orderedList'
  | 'listItem'
  | 'blockquote'
  | 'codeBlock'
  | 'hardBreak'
  | 'horizontalRule';

/* ===== БАЗОВЫЕ ИНТЕРФЕЙСЫ ===== */
export interface TiptapText {
  type: 'text';
  text: string;
  marks?: TiptapMark[];
}

export interface TiptapParagraph {
  type: 'paragraph';
  content?: TiptapText[];
  attrs?: {
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textIndent?: number; // px
    lineHeight?: number; // multiplier
    letterSpacing?: number; // px
    marginTop?: number; // px
    marginBottom?: number; // px
  };
}

export interface TiptapHeading {
  type: 'heading';
  content?: TiptapText[];
  attrs: {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
  };
}

export interface TiptapImage {
  type: 'image';
  attrs: {
    src: string; // base64 или URL
    alt?: string;
    width?: number; // px
    height?: number; // px
    align?: 'left' | 'center' | 'right';
  };
}

/* ===== ТАБЛИЦЫ ===== */
export interface TiptapTableCell {
  type: 'tableCell' | 'tableHeader';
  content?: TiptapParagraph[];
  attrs?: {
    colwidth?: number[]; // [width] в px
    rowspan?: number;
    colspan?: number;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    borderWidth?: number;
    borderColor?: string;
  };
}

export interface TiptapTableRow {
  type: 'tableRow';
  content: TiptapTableCell[];
}

export interface TiptapTable {
  type: 'table';
  content: TiptapTableRow[];
  attrs?: {
    width?: number; // px или %
    borderWidth?: number;
    borderColor?: string;
    backgroundColor?: string;
  };
}

/* ===== СПИСКИ ===== */
export interface TiptapListItem {
  type: 'listItem';
  content?: TiptapParagraph[];
}

export interface TiptapBulletList {
  type: 'bulletList';
  content: TiptapListItem[];
}

export interface TiptapOrderedList {
  type: 'orderedList';
  content: TiptapListItem[];
  attrs?: {
    order?: number; // start number
  };
}

/* ===== ПРОЧИЕ БЛОКИ ===== */
export interface TiptapHorizontalRule {
  type: 'horizontalRule';
  attrs?: {
    thickness?: number;
    color?: string;
    style?: 'solid' | 'dashed' | 'dotted';
  };
}

export interface TiptapBlockquote {
  type: 'blockquote';
  content?: TiptapParagraph[];
}

export interface TiptapCodeBlock {
  type: 'codeBlock';
  content?: TiptapText[];
  attrs?: {
    language?: string;
  };
}

/* ===== ОБЪЕДИНЁННЫЙ ТИП КОНТЕНТА ===== */
export type TiptapContentNode =
  | TiptapParagraph
  | TiptapHeading
  | TiptapImage
  | TiptapTable
  | TiptapBulletList
  | TiptapOrderedList
  | TiptapHorizontalRule
  | TiptapBlockquote
  | TiptapCodeBlock;

/* ===== ДОКУМЕНТ ===== */
export interface TiptapDocument {
  type: 'doc';
  content: TiptapContentNode[];
  attrs?: TiptapDocumentAttrs;
}

export interface TiptapDocumentAttrs {
  // Метаданные документа для экспорта
  pageWidth?: number; // px (по умолчанию 794 для A4)
  pageHeight?: number; // px (по умолчанию 1123 для A4)
  marginTop?: number; // px
  marginRight?: number; // px
  marginBottom?: number; // px
  marginLeft?: number; // px
  
  // Стили по умолчанию
  fontFamily?: string;
  fontSize?: number; // px
  lineHeight?: number; // multiplier
  color?: string;
  
  // Для обратной совместимости
  _legacyCanvasElements?: unknown[]; // Исходные элементы Canvas (опционально)
}

/* ===== МАППИНГ: Canvas → Tiptap ===== */
export interface CanvasToTiptapMapping {
  canvasType: string;
  tiptapType: TiptapNodeType;
  converter: (element: unknown) => TiptapContentNode | null;
}

/* ===== ВСПОМОГАТЕЛЬНЫЕ ТИПЫ ДЛЯ МИГРАЦИИ ===== */
export interface MigrationResult {
  success: boolean;
  document: TiptapDocument | null;
  errors: MigrationError[];
  warnings: MigrationWarning[];
}

export interface MigrationError {
  elementId: string;
  message: string;
  critical: boolean;
}

export interface MigrationWarning {
  elementId: string;
  message: string;
  suggestion?: string;
}
