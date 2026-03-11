// src/utils/help/generateDocx.ts

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  FrameAnchorType,
  BorderStyle,
  TableAnchorType,
  OverlapType,
  HeightRule,
  AlignmentType,
} from "docx";
import type {
  IEditorElement,
  ITextProperties,
  ITableProperties,
  IDividerProperties,
} from "..//types/editor.types";

// 1 px ≈ 15 twips (примерно, зависит от DPI, но для Word стандартно)
const PX_TO_TWIP = 15;

export async function generateDocx(
  elements: IEditorElement[],
  title: string,
  description: string,
): Promise<Blob> {
  // Сортировка элементов по Z-index
  const sortedElements = [...elements].sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
  );

  const docChildren: (Paragraph | Table)[] = [];

  for (const el of sortedElements) {
    try {
      const xTwips = Math.round(el.x * PX_TO_TWIP);
      const yTwips = Math.round(el.y * PX_TO_TWIP);
      const wTwips = Math.round(el.width * PX_TO_TWIP);
      const hTwips = Math.round(el.height * PX_TO_TWIP);

      // Настройки плавающего фрейма (абсолютное позиционирование)
      const frameOptions = {
        position: { x: xTwips, y: yTwips },
        width: { value: wTwips, type: WidthType.DXA },
        height: { value: hTwips, rule: HeightRule.EXACT },
        anchor: {
          horizontal: FrameAnchorType.PAGE,
          vertical: FrameAnchorType.PAGE,
        },
      };

      /* ================= ТЕКСТ ================= */
      if (el.type === "text") {
        const p = el.properties as ITextProperties;

        // Конвертация цвета (убираем #)
        const colorHex = p.color?.replace("#", "") || "000000";

        // ✅ FIX: Явно типизируем как значение из AlignmentType
        let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] =
          AlignmentType.LEFT;

        switch (p.align) {
          case "center":
            alignment = AlignmentType.CENTER;
            break;
          case "right":
            alignment = AlignmentType.RIGHT;
            break;
          case "left":
          default:
            alignment = AlignmentType.LEFT;
            break;
        }

        docChildren.push(
          new Paragraph({
            frame: frameOptions as any,
            alignment: alignment,
            children: [
              new TextRun({
                text: p.content || "",
                font: p.fontFamily || "Inter",
                size: (p.fontSize || 14) * 2, // В docx размер в полупунктах
                bold: p.bold,
                italics: p.italic,
                underline: p.underline ? { type: "single" } : undefined,
                color: colorHex,
              }),
            ],
          }),
        );
      } else if (el.type === "image" || el.type === "signature") {
        /* ================= ИЗОБРАЖЕНИЕ / ПОДПИСЬ ================= */
        const p = el.properties as any;
        const src = el.type === "signature" ? p.image : p.src;

        if (src && typeof src === "string" && src.startsWith("data:")) {
          try {
            // 1. Определяем тип (png/jpeg/gif)
            const mimeType = src.split(";")[0].split(":")[1];
            const base64Data = src.split(",")[1];

            if (!base64Data) continue;

            // ✅ FIX: docx ожидает 'jpg' а не 'jpeg'
            let imgType: "png" | "jpg" | "gif" = "png";
            if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
              imgType = "jpg"; // ✅ Используем 'jpg' вместо 'jpeg'
            }
            if (mimeType.includes("gif")) {
              imgType = "gif";
            }

            // 2. Преобразуем в бинарник
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            docChildren.push(
              new Paragraph({
                frame: frameOptions as any,
                children: [
                  new ImageRun({
                    data: bytes,
                    transformation: {
                      width: el.width,
                      height: el.height,
                    },
                    type: imgType,
                  }),
                ],
              }),
            );
          } catch (imgErr) {
            console.error("Ошибка добавления картинки в DOCX:", imgErr);
            docChildren.push(
              new Paragraph({
                frame: frameOptions as any,
                children: [
                  new TextRun({
                    text: "[Ошибка изображения]",
                    color: "FF0000",
                  }),
                ],
              }),
            );
          }
        }
        // Если это подпись без картинки (текстовая)
        else if (el.type === "signature" && p.text) {
          docChildren.push(
            new Paragraph({
              frame: frameOptions as any,
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: p.text,
                  size: (p.fontSize || 18) * 2,
                  italics: true,
                  font: "Brush Script MT",
                }),
              ],
            }),
          );
        }
      } else if (el.type === "table") {
        /* ================= ТАБЛИЦА ================= */
        const pr = el.properties as ITableProperties;
        const data = pr.data || [];
        const rowsCount = pr.rows || 0;
        const colsCount = pr.cols || 0;

        const safeData = data.length
          ? data
          : Array(rowsCount)
              .fill(null)
              .map(() => Array(colsCount).fill(""));

        const tableRows: TableRow[] = [];
        const colWidthTwips = Math.floor(wTwips / (colsCount || 1));

        for (let i = 0; i < safeData.length; i++) {
          const cells: TableCell[] = [];
          const rowData = safeData[i] || [];

          for (let j = 0; j < colsCount; j++) {
            cells.push(
              new TableCell({
                width: { size: colWidthTwips, type: WidthType.DXA },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 2,
                    color: "000000",
                  },
                  left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 2,
                    color: "000000",
                  },
                },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: rowData[j] || "",
                        size: 24,
                      }),
                    ],
                  }),
                ],
              }),
            );
          }
          tableRows.push(new TableRow({ children: cells }));
        }

        docChildren.push(
          new Table({
            rows: tableRows,
            width: { size: wTwips, type: WidthType.DXA },
            float: {
              absoluteHorizontalPosition: xTwips,
              absoluteVerticalPosition: yTwips,
              horizontalAnchor: TableAnchorType.PAGE,
              verticalAnchor: TableAnchorType.PAGE,
              overlap: OverlapType.NEVER,
            },
          }),
        );
      } else if (el.type === "divider") {
        /* ================= РАЗДЕЛИТЕЛЬ ================= */
        const p = el.properties as IDividerProperties;

        // ✅ FIX: Явно типизируем как значение из BorderStyle
        let borderStyle: (typeof BorderStyle)[keyof typeof BorderStyle] =
          BorderStyle.SINGLE;

        switch (p.style) {
          case "dashed":
            borderStyle = BorderStyle.DASHED;
            break;
          case "dotted":
            borderStyle = BorderStyle.DOTTED;
            break;
          case "solid":
          default:
            borderStyle = BorderStyle.SINGLE;
            break;
        }

        docChildren.push(
          new Paragraph({
            frame: frameOptions as any,
            children: [],
            border: {
              bottom: {
                style: borderStyle,
                size: (p.thickness || 1) * 4,
                color: p.color?.replace("#", "") || "000000",
                space: 1,
              },
            },
          }),
        );
      }
    } catch (elemErr) {
      console.warn(`Не удалось экспортировать элемент ${el.id}`, elemErr);
    }
  }

  // Создаем сам документ
  const doc = new Document({
    creator: "Gemini Editor",
    title: title,
    description: description,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
        children: docChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}
