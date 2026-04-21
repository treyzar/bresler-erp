import { jsPDF } from "jspdf";
import type { IEditorElement } from "../types/editor.types";
import { A4_HEIGHT, A4_WIDTH } from "../constants/editor.constants";
import { loadCustomFont, PDF_UNICODE_FONT_FAMILY } from "./pdfFonts";

type JsonMap = Record<string, unknown>;

function normalizeHex(color?: string, fallback = "#000000"): string {
  if (!color) return fallback;
  if (color.startsWith("#")) return color;
  return fallback;
}

function imageFormatFromDataUri(src: string): "PNG" | "JPEG" | "WEBP" {
  if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/jpg")) return "JPEG";
  if (src.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

function getPreferredPdfFont(doc: jsPDF): string {
  try {
    const fontList = doc.getFontList() as Record<string, string[]>;
    if (fontList[PDF_UNICODE_FONT_FAMILY] && canSplitTextWithFont(doc, PDF_UNICODE_FONT_FAMILY, "normal")) {
      return PDF_UNICODE_FONT_FAMILY;
    }
    if (fontList["helvetica"]) return "helvetica";
  } catch {
    // noop
  }
  return "helvetica";
}

function canSplitTextWithFont(
  doc: jsPDF,
  family: string,
  style: "normal" | "bold" | "italic" | "bolditalic"
): boolean {
  try {
    doc.setFont(family, style);
    doc.splitTextToSize("Test Привет", 120);
    return true;
  } catch {
    return false;
  }
}

function safeSetFont(
  doc: jsPDF,
  family: string,
  style: "normal" | "bold" | "italic" | "bolditalic"
): void {
  if (canSplitTextWithFont(doc, family, style)) {
    doc.setFont(family, style);
    return;
  }
  if (family === PDF_UNICODE_FONT_FAMILY && canSplitTextWithFont(doc, family, "normal")) {
    // Для кастомного Unicode-шрифта у нас обычно только normal,
    // поэтому оставляем кириллицу при потере начертания.
    doc.setFont(family, "normal");
    return;
  }
  if (canSplitTextWithFont(doc, "helvetica", style)) {
    doc.setFont("helvetica", style);
    return;
  }
  try {
    doc.setFont(family, style);
  } catch {
    try {
      doc.setFont("helvetica", style);
    } catch {
      // noop
    }
  }
}

function safeSplitTextToSize(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  preferredFamily: string,
  style: "normal" | "bold" | "italic" | "bolditalic"
): string[] {
  try {
    safeSetFont(doc, preferredFamily, style);
    return doc.splitTextToSize(text, maxWidth);
  } catch {
    safeSetFont(doc, "helvetica", style);
    return doc.splitTextToSize(text, maxWidth);
  }
}

function tryAddImage(doc: jsPDF, src: string, x: number, y: number, w: number, h: number): void {
  const preferred = imageFormatFromDataUri(src);
  const formats: Array<"PNG" | "JPEG" | "WEBP"> =
    preferred === "PNG" ? ["PNG", "JPEG", "WEBP"] :
    preferred === "JPEG" ? ["JPEG", "PNG", "WEBP"] :
    ["WEBP", "PNG", "JPEG"];

  let lastError: unknown = null;
  for (const fmt of formats) {
    try {
      doc.addImage(src, fmt, x, y, w, h);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("Failed to add image");
}

export const generatePdf = async (elements: IEditorElement[], title: string): Promise<void> => {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait",
  });

  await loadCustomFont(doc);
  const activeFont = getPreferredPdfFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const scale = pageWidth / A4_WIDTH;
  const maxPage = Math.max(
    0,
    ...elements.map((el) =>
      Math.floor(
        (Math.max(0, el.y) + Math.max(1, el.height) - 1) / A4_HEIGHT
      )
    )
  );
  for (let i = 1; i <= maxPage; i++) {
    doc.addPage();
  }

  for (let pageIdx = 0; pageIdx <= maxPage; pageIdx++) {
    doc.setPage(pageIdx + 1);
    const pageTop = pageIdx * A4_HEIGHT;
    const pageBottom = pageTop + A4_HEIGHT;

    const pageElements = elements
      .filter((el) => {
        if (el.type === "table") {
          const elTop = Math.max(0, Number(el.y) || 0);
          const elBottom = elTop + Math.max(1, Number(el.height) || 0);
          return elTop < pageBottom && elBottom > pageTop;
        }
        return Math.max(0, Math.floor(el.y / A4_HEIGHT)) === pageIdx;
      })
      .sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0) || a.y - b.y || a.x - b.x
    );

    for (const el of pageElements) {
      const p = el.properties as unknown as JsonMap;
      const localY = el.y - pageIdx * A4_HEIGHT;
      const x = el.x * scale;
      const y = localY * scale;
      const w = Math.max(1, el.width * scale);
      const h = Math.max(1, el.height * scale);

      try {
        if (el.type === "text") {
          const fontSize = Math.max(9, (Number(p.fontSize || 14)) * scale);
          const lineHeight = Math.max(fontSize * 1.15, fontSize * Number(p.lineHeight || 1.4));
          const color = normalizeHex(String(p.color || "#000000"));
          const content = String(p.content || "");

          const fontStyle = `${p.bold ? "bold" : ""}${p.italic ? "italic" : ""}` || "normal";
          safeSetFont(doc, activeFont, fontStyle as "normal" | "bold" | "italic" | "bolditalic");
          doc.setFontSize(fontSize);
          doc.setTextColor(color);

          let currentY = y + fontSize;
          const paragraphs = content.split("\n");
          for (const paragraph of paragraphs) {
            const lines = safeSplitTextToSize(
              doc,
              paragraph || " ",
              Math.max(10, w - 2),
              activeFont,
              fontStyle as "normal" | "bold" | "italic" | "bolditalic"
            );
            for (const line of lines) {
              let lineX = x;
              let align: "left" | "center" | "right" = "left";
              if (p.align === "center") {
                lineX = x + w / 2;
                align = "center";
              } else if (p.align === "right") {
                lineX = x + w;
                align = "right";
              }
              doc.text(String(line), lineX, currentY, { align });
              currentY += lineHeight;
            }
          }
        } else if (el.type === "image" || el.type === "signature") {
          const src = String(p.image || p.src || "");
          if (src.startsWith("data:image/")) {
            tryAddImage(doc, src, x, y, w, h);
          } else if (el.type === "signature" && p.text) {
            // Style "italic" не зарегистрирован для кастомного Unicode-шрифта —
            // jsPDF молча откатывается на Helvetica, которая превращает кириллицу в мусор.
            // Используем "normal" явно, чтобы остаться на Unicode-шрифте.
            safeSetFont(doc, activeFont, "normal");
            doc.setFontSize(Math.max(10, Number(p.fontSize || 14) * scale));
            doc.setTextColor(normalizeHex(String(p.color || "#000000")));
            doc.text(String(p.text), x + w / 2, y + h / 2, { align: "center", baseline: "middle" });
          }
        } else if (el.type === "table") {
          const borderWidth = Math.max(0.5, Number(p.borderWidth || 1) * scale);
          doc.setLineWidth(borderWidth);
          doc.setDrawColor(normalizeHex(String(p.borderColor || "#000000")));
          safeSetFont(doc, activeFont, "normal");
          const tableFontSize = Math.max(9, 11 * scale);
          doc.setFontSize(tableFontSize);

          const isFlexible = Array.isArray(p.cells) && Array.isArray(p.columns);
          if (isFlexible) {
            const cells = p.cells as JsonMap[][];
            const columns = p.columns as JsonMap[];
            const rows = Math.max(1, cells.length);
            const rowHeight = h / rows;
            const totalColumnWidth =
              columns.reduce((acc, c) => acc + (Number(c.width || 100) || 100), 0) || 1;
            const colWidths = columns.map((c) => (w * (Number(c.width || 100) || 100)) / totalColumnWidth);

            for (let r = 0; r < rows; r++) {
              let cursorX = x;
              for (let c = 0; c < colWidths.length; c++) {
                const cw = colWidths[c];
                const cell = cells[r]?.[c];
                const cy = y + r * rowHeight;
                const rowTop = cy;
                const rowBottom = cy + rowHeight;
                if (rowBottom <= 0 || rowTop >= pageHeight) {
                  cursorX += cw;
                  continue;
                }

                const drawY = Math.max(0, rowTop);
                const drawH = Math.min(pageHeight, rowBottom) - drawY;
                if (drawH <= 0.5) {
                  cursorX += cw;
                  continue;
                }

                doc.rect(cursorX, drawY, cw, drawH);
                const cellText = String(cell?.content || "");
                if (cellText) {
                  const textLines = safeSplitTextToSize(
                    doc,
                    cellText,
                    Math.max(10, cw - 6),
                    activeFont,
                    "normal"
                  );
                  const style = (cell?.style || {}) as JsonMap;
                  const color = normalizeHex(String(style.color || "#000000"));
                  doc.setTextColor(color);
                  doc.text(textLines, cursorX + 3, drawY + Math.max(10, tableFontSize), {
                    baseline: "top",
                    maxWidth: cw - 6,
                  });
                }
                cursorX += cw;
              }
            }
          } else {
            const rows = Math.max(1, Number(p.rows || 1));
            const cols = Math.max(1, Number(p.cols || 1));
            const data = Array.isArray(p.data) ? p.data : [];
            const cw = w / cols;
            const ch = h / rows;

            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                const cx = x + c * cw;
                const cy = y + r * ch;
                const rowTop = cy;
                const rowBottom = cy + ch;
                if (rowBottom <= 0 || rowTop >= pageHeight) continue;

                const drawY = Math.max(0, rowTop);
                const drawH = Math.min(pageHeight, rowBottom) - drawY;
                if (drawH <= 0.5) continue;

                doc.rect(cx, drawY, cw, drawH);
                const text = String(data[r]?.[c] || "");
                if (text) {
                  const textLines = safeSplitTextToSize(
                    doc,
                    text,
                    Math.max(10, cw - 6),
                    activeFont,
                    "normal"
                  );
                  const matrix = (p.cellTextColors || []) as string[][];
                  const color = normalizeHex(String(matrix[r]?.[c] || "#000000"));
                  doc.setTextColor(color);
                  doc.text(textLines, cx + 3, drawY + Math.max(10, tableFontSize), {
                    baseline: "top",
                    maxWidth: cw - 6,
                  });
                }
              }
            }
          }
        } else if (el.type === "divider") {
          doc.setLineWidth(Math.max(0.5, Number(p.thickness || 1) * scale));
          doc.setDrawColor(normalizeHex(String(p.color || "#000000")));
          const dashed = p.style === "dashed";
          const dotted = p.style === "dotted";
          const api = doc as unknown as { setLineDashPattern?: (dashArray: number[], phase: number) => void };
          if (typeof api.setLineDashPattern === "function") {
            if (dashed) api.setLineDashPattern([4, 3], 0);
            else if (dotted) api.setLineDashPattern([1, 2], 0);
            else api.setLineDashPattern([], 0);
          }
          const lineY = y + h / 2;
          doc.line(x, lineY, x + w, lineY);
          if (typeof api.setLineDashPattern === "function") {
            api.setLineDashPattern([], 0);
          }
        }
      } catch (err) {
        console.error(`PDF export failed for element ${el.id}:`, err);
      }
    }
  }

  doc.save(`${title || "document"}.pdf`);
};
