// src/utils/help/createDefaultElement.ts

import type { TElementType, IEditorElement } from "../types/editor.types";
import { A4_HEIGHT, A4_WIDTH } from "../constants/editor.constants";

export function createDefaultElement(
  type: TElementType,
  id: string,
  snap: (v: number) => number,
): IEditorElement {
  const base = {
    id,
    x: snap(A4_WIDTH / 2 - 150),
    y: snap(A4_HEIGHT / 2 - 100),
    zIndex: 0,
  };

  if (type === "text")
    return {
      ...base,
      type,
      width: 300,
      height: 120, // Увеличил для многострочного текста
      properties: {
        content: "Новый текст",
        fontFamily: "Inter",
        fontSize: 14,
        color: "#1a1a1a",
        bold: false,
        italic: false,
        underline: false,
        align: "left",
        // Новые свойства
        textIndent: 0,
        lineHeight: 1.5,
        letterSpacing: 0,
        whiteSpace: "pre-wrap", // Сохраняет переносы строк!
        wordBreak: "break-word",
        paragraphSpacing: 8,
      },
    };

  if (type === "image")
    return {
      ...base,
      type,
      width: 250,
      height: 200,
      properties: { src: "", alt: "Image" },
    };

  if (type === "table")
    return {
      ...base,
      type,
      width: 450,
      height: 120,
      properties: {
        borderWidth: 1,
        borderColor: "#1a1a1a",
        cellBg: "transparent",
        // Новая структура
        columns: [
          { width: 150 },
          { width: 150 },
          { width: 150 }
        ],
        cells: [
          [
            { id: "c1", content: "", rowSpan: 1, colSpan: 1 },
            { id: "c2", content: "", rowSpan: 1, colSpan: 1 },
            { id: "c3", content: "", rowSpan: 1, colSpan: 1 }
          ],
          [
            { id: "c4", content: "", rowSpan: 1, colSpan: 1 },
            { id: "c5", content: "", rowSpan: 1, colSpan: 1 },
            { id: "c6", content: "", rowSpan: 1, colSpan: 1 }
          ],
          [
            { id: "c7", content: "", rowSpan: 1, colSpan: 1 },
            { id: "c8", content: "", rowSpan: 1, colSpan: 1 },
            { id: "c9", content: "", rowSpan: 1, colSpan: 1 }
          ]
        ]
      },
    };

  if (type === "date")
    return {
      ...base,
      type,
      width: 150,
      height: 40,
      properties: {
        format: "DD.MM.YYYY",
        value: new Date().toISOString().split("T")[0],
      },
    };

  if (type === "signature")
    return {
      ...base,
      type,
      width: 150,
      height: 40,
      properties: { text: "Подпись", fontSize: 16, color: "#8b8b8bff" },
    };

  if (type === "divider")
    return {
      ...base,
      type,
      width: 150,
      height: 40,
      properties: { thickness: 1, color: "#1a1a1a", style: "solid" as const },
    };

  throw new Error("Unknown element type");
}
