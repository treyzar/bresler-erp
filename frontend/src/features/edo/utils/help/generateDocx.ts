import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { ISectionOptions } from "docx";
import type { IEditorElement } from "../types/editor.types";
import { A4_HEIGHT, A4_WIDTH } from "../constants/editor.constants";

const PX_TO_TWIP = 15;
const PAGE_MARGIN_TWIP = 720;
type JsonMap = Record<string, unknown>;

function pxToTwip(px: number): number {
  return Math.max(0, Math.round(px * PX_TO_TWIP));
}

function colorToHexNoHash(color?: string, fallback = "000000"): string {
  if (!color) return fallback;
  const normalized = color.trim();
  if (normalized.startsWith("#") && normalized.length === 7) {
    return normalized.slice(1).toUpperCase();
  }
  if (normalized.startsWith("#") && normalized.length === 4) {
    return normalized
      .slice(1)
      .split("")
      .map((ch) => ch + ch)
      .join("")
      .toUpperCase();
  }
  return fallback;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function imageFromDataUri(dataUri: string): { bytes: Uint8Array; type: "png" | "jpg" | "gif" } | null {
  if (!dataUri.startsWith("data:image/")) return null;
  const [header, base64] = dataUri.split(",");
  if (!header || !base64) return null;

  let type: "png" | "jpg" | "gif" = "png";
  if (header.includes("jpeg") || header.includes("jpg")) type = "jpg";
  if (header.includes("gif")) type = "gif";

  return { bytes: base64ToUint8Array(base64), type };
}

function makeSpacer(gapPx: number): Paragraph | null {
  if (gapPx <= 2) return null;
  return new Paragraph({
    spacing: {
      before: pxToTwip(gapPx),
      after: 0,
    },
    children: [],
  });
}

function tableFromLegacy(el: IEditorElement, p: JsonMap): Table {
  const rows = Math.max(1, Number(p.rows || 1));
  const cols = Math.max(1, Number(p.cols || 1));
  const data = Array.isArray(p.data) ? p.data : [];
  const cellColors = Array.isArray(p.cellTextColors) ? p.cellTextColors : [];
  const tableWidthTwip = pxToTwip(el.width);
  const colWidthTwip = Math.floor(tableWidthTwip / cols);
  const borderColor = colorToHexNoHash(p.borderColor, "000000");
  const borderSize = Math.max(2, Math.round(Number(p.borderWidth || 1) * 4));

  const tableRows: TableRow[] = [];
  for (let r = 0; r < rows; r++) {
    const cells: TableCell[] = [];
    for (let c = 0; c < cols; c++) {
      cells.push(
        new TableCell({
          width: { size: colWidthTwip, type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.SINGLE, size: borderSize, color: borderColor },
            bottom: { style: BorderStyle.SINGLE, size: borderSize, color: borderColor },
            left: { style: BorderStyle.SINGLE, size: borderSize, color: borderColor },
            right: { style: BorderStyle.SINGLE, size: borderSize, color: borderColor },
          },
          verticalAlign: VerticalAlign.TOP,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: String(data[r]?.[c] || ""),
                  size: 24,
                  color: colorToHexNoHash(cellColors[r]?.[c], "000000"),
                }),
              ],
            }),
          ],
        })
      );
    }
    tableRows.push(new TableRow({ children: cells }));
  }

  return new Table({
    width: { size: tableWidthTwip, type: WidthType.DXA },
    rows: tableRows,
  });
}

function tableFromFlexible(el: IEditorElement, p: JsonMap): Table {
  const rows = (Array.isArray(p.cells) ? p.cells : []) as JsonMap[][];
  const columns = (Array.isArray(p.columns) ? p.columns : []) as JsonMap[];
  const borderColorDefault = colorToHexNoHash(p.borderColor, "000000");
  const borderSizeDefault = Math.max(2, Math.round(Number(p.borderWidth || 1) * 4));

  const totalColumnWidth = columns.reduce((acc: number, col) => acc + (Number(col.width || 100) || 100), 0) || 1;
  const tableWidthTwip = pxToTwip(el.width);
  const colTwips = columns.map((col) =>
    Math.max(180, Math.round((tableWidthTwip * (Number(col.width || 100) || 100)) / totalColumnWidth))
  );

  const tableRows: TableRow[] = rows.map((row: JsonMap[]) => {
    const tableCells: TableCell[] = [];

    row.forEach((cell: JsonMap, colIdx: number) => {
      if (!cell) return;
      const style = (cell.style || {}) as JsonMap;
      tableCells.push(
        new TableCell({
          width: {
            size: colTwips[colIdx] || Math.floor(tableWidthTwip / Math.max(1, columns.length || 1)),
            type: WidthType.DXA,
          },
          rowSpan: Math.max(1, Number(cell.rowSpan || 1)),
          columnSpan: Math.max(1, Number(cell.colSpan || 1)),
          verticalAlign: VerticalAlign.TOP,
          shading: style.backgroundColor
            ? { fill: colorToHexNoHash(style.backgroundColor, "FFFFFF"), color: "auto" }
            : undefined,
          borders: {
            top: {
              style: BorderStyle.SINGLE,
              size: Math.max(2, Math.round(Number(style.borderWidth || borderSizeDefault / 4) * 4)),
              color: colorToHexNoHash(style.borderColor, borderColorDefault),
            },
            bottom: {
              style: BorderStyle.SINGLE,
              size: Math.max(2, Math.round(Number(style.borderWidth || borderSizeDefault / 4) * 4)),
              color: colorToHexNoHash(style.borderColor, borderColorDefault),
            },
            left: {
              style: BorderStyle.SINGLE,
              size: Math.max(2, Math.round(Number(style.borderWidth || borderSizeDefault / 4) * 4)),
              color: colorToHexNoHash(style.borderColor, borderColorDefault),
            },
            right: {
              style: BorderStyle.SINGLE,
              size: Math.max(2, Math.round(Number(style.borderWidth || borderSizeDefault / 4) * 4)),
              color: colorToHexNoHash(style.borderColor, borderColorDefault),
            },
          },
          children: [
            new Paragraph({
              alignment:
                style.textAlign === "center"
                  ? AlignmentType.CENTER
                  : style.textAlign === "right"
                    ? AlignmentType.RIGHT
                    : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: String(cell.content || ""),
                  size: Math.max(14, Number(style.fontSize || 12) * 2),
                  bold: style.fontWeight === "bold",
                  color: colorToHexNoHash(style.color, "000000"),
                }),
              ],
            }),
          ],
        })
      );
    });

    return new TableRow({ children: tableCells });
  });

  return new Table({
    width: { size: tableWidthTwip, type: WidthType.DXA },
    rows: tableRows,
  });
}

function groupByPage(elements: IEditorElement[]): Map<number, IEditorElement[]> {
  const pages = new Map<number, IEditorElement[]>();
  for (const el of elements) {
    const pageIdx = Math.max(0, Math.floor(el.y / A4_HEIGHT));
    if (!pages.has(pageIdx)) pages.set(pageIdx, []);
    pages.get(pageIdx)!.push(el);
  }
  return pages;
}

export async function generateDocx(
  elements: IEditorElement[],
  title: string,
  description: string
): Promise<Blob> {
  const byPage = groupByPage(elements);
  const maxPage = Math.max(0, ...Array.from(byPage.keys()));
  const sections: ISectionOptions[] = [];

  for (let pageIdx = 0; pageIdx <= maxPage; pageIdx++) {
    const pageElements = [...(byPage.get(pageIdx) || [])].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return (a.zIndex || 0) - (b.zIndex || 0);
    });

    const children: (Paragraph | Table)[] = [];
    let cursorY = 0;

    for (const el of pageElements) {
      const p = el.properties as JsonMap;
      const localY = Math.max(0, el.y - pageIdx * A4_HEIGHT);
      const gap = Math.max(0, localY - cursorY);
      const spacer = makeSpacer(gap);
      if (spacer) children.push(spacer);

      try {
        if (el.type === "text") {
          const lines = String(p.content || "").split("\n");
          const align =
            p.align === "center"
              ? AlignmentType.CENTER
              : p.align === "right"
                ? AlignmentType.RIGHT
                : p.align === "justify"
                  ? AlignmentType.JUSTIFIED
                  : AlignmentType.LEFT;

          lines.forEach((line: string, idx: number) => {
            children.push(
              new Paragraph({
                alignment: align,
                indent: {
                  left: pxToTwip(el.x),
                  firstLine: idx === 0 ? pxToTwip(Number(p.textIndent || 0)) : 0,
                },
                spacing: {
                  before: idx === 0 ? 0 : 0,
                  after: idx === lines.length - 1 ? pxToTwip(Number(p.paragraphSpacing || 0)) : 0,
                  line: pxToTwip((Number(p.fontSize || 14) * Number(p.lineHeight || 1.3)) / 1.6),
                },
                children: [
                  new TextRun({
                    text: line || " ",
                    font: p.fontFamily || "Inter",
                    size: Math.max(16, Number(p.fontSize || 14) * 2),
                    color: colorToHexNoHash(p.color, "000000"),
                    bold: !!p.bold,
                    italics: !!p.italic,
                    underline: p.underline ? { type: "single" } : undefined,
                  }),
                ],
              })
            );
          });
        } else if (el.type === "image" || el.type === "signature") {
          const src = String(p.image || p.src || "");
          const image = imageFromDataUri(src);
          if (image) {
            children.push(
              new Paragraph({
                indent: { left: pxToTwip(el.x) },
                children: [
                  new ImageRun({
                    data: image.bytes,
                    transformation: { width: Math.round(el.width), height: Math.round(el.height) },
                    type: image.type,
                  }),
                ],
              })
            );
          } else if (el.type === "signature" && p.text) {
            children.push(
              new Paragraph({
                indent: { left: pxToTwip(el.x) },
                children: [
                  new TextRun({
                    text: String(p.text),
                    size: Math.max(20, Number(p.fontSize || 16) * 2),
                    italics: true,
                    color: colorToHexNoHash(p.color, "000000"),
                  }),
                ],
              })
            );
          }
        } else if (el.type === "table") {
          children.push(
            new Paragraph({
              indent: { left: pxToTwip(el.x) },
              children: [],
            })
          );
          const table =
            Array.isArray(p.cells) && Array.isArray(p.columns)
              ? tableFromFlexible(el, p)
              : tableFromLegacy(el, p);
          children.push(table);
        } else if (el.type === "divider") {
          const style =
            p.style === "dashed"
              ? BorderStyle.DASHED
              : p.style === "dotted"
                ? BorderStyle.DOTTED
                : BorderStyle.SINGLE;
          children.push(
            new Paragraph({
              indent: {
                left: pxToTwip(el.x),
                right: pxToTwip(Math.max(0, A4_WIDTH - el.x - el.width)),
              },
              border: {
                bottom: {
                  style,
                  size: Math.max(2, Math.round(Number(p.thickness || 1) * 8)),
                  color: colorToHexNoHash(p.color, "000000"),
                  space: 1,
                },
              },
              children: [],
            })
          );
        }
      } catch (err) {
        console.warn(`DOCX export failed for element ${el.id}:`, err);
      }

      cursorY = Math.max(cursorY, localY + Math.max(1, el.height));
    }

    sections.push({
      properties: {
        page: {
          margin: {
            top: PAGE_MARGIN_TWIP,
            right: PAGE_MARGIN_TWIP,
            bottom: PAGE_MARGIN_TWIP,
            left: PAGE_MARGIN_TWIP,
          },
        },
      },
      children,
    });
  }

  const doc = new Document({
    creator: "Bresler ERP",
    title,
    description,
    sections,
  });

  return Packer.toBlob(doc);
}
