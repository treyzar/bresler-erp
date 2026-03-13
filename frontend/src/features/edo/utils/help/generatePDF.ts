import { jsPDF } from "jspdf";
import type { IEditorElement, ITableProperties } from "../types/editor.types";
import { A4_WIDTH } from "..//constants/editor.constants";
import { loadCustomFont } from "./pdfFonts";

export const generatePdf = async (
  elements: IEditorElement[],
  title: string
): Promise<void> => {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait",
  });

  await loadCustomFont(doc);

  const pdfPageWidth = doc.internal.pageSize.getWidth();
  const scale = pdfPageWidth / A4_WIDTH;

  const sortedElements = [...elements].sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
  );

  for (const el of sortedElements) {
    const x = el.x * scale;
    const y = el.y * scale;
    const w = el.width * scale;
    const h = el.height * scale;
    const p = el.properties as any;

    try {
      // --- ТЕКСТ ---
      if (el.type === "text") {
        const fontSize = (p.fontSize || 16) * scale;
        doc.setFontSize(fontSize);
        doc.setTextColor(p.color || "#000000");

        const align = p.align || "left";
        let textX = x;
        if (align === "center") textX = x + w / 2;
        else if (align === "right") textX = x + w;

        doc.text(p.content || "", textX, y, {
          maxWidth: w,
          align: align === "justify" ? "left" : align,
          baseline: "top",
        });
      }

      // --- ИЗОБРАЖЕНИЕ / ПОДПИСЬ ---
      else if (el.type === "image" || el.type === "signature") {
        const imgSrc = p.image || p.src;
        if (imgSrc) {
          doc.addImage(imgSrc, "PNG", x, y, w, h);
        } else if (el.type === "signature" && p.text) {
          doc.setFontSize(14 * scale);
          doc.setTextColor("#000000");
          doc.text(p.text, x, y + h / 2, { baseline: "middle" });
        }
      }

      // --- ТАБЛИЦА (ДОБАВЛЕНО) ---
      else if (el.type === "table") {
        const pr = el.properties as ITableProperties;
        const rows = pr.rows || 1;
        const cols = pr.cols || 1;
        const data = pr.data || [];

        // Вычисляем размеры ячеек
        const cellWidth = w / cols;
        const cellHeight = h / rows;

        doc.setLineWidth(1 * scale); // Толщина границ
        doc.setDrawColor(0, 0, 0); // Черный цвет границ

        // Установка шрифта для таблицы
        doc.setFontSize(12 * scale);
        doc.setTextColor("#000000");

        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const cellX = x + j * cellWidth;
            const cellY = y + i * cellHeight;

            // Рисуем рамку ячейки
            doc.rect(cellX, cellY, cellWidth, cellHeight);

            // Рисуем текст внутри
            const cellText = data[i]?.[j] || "";
            if (cellText) {
              // Небольшой отступ текста внутри ячейки
              doc.text(cellText, cellX + 5 * scale, cellY + 15 * scale, {
                maxWidth: cellWidth - 10 * scale,
              });
            }
          }
        }
      }

      // --- РАЗДЕЛИТЕЛЬ ---
      else if (el.type === "divider") {
        const thickness = (p.thickness || 1) * scale;
        doc.setLineWidth(thickness);
        doc.setDrawColor(p.color || "#000000");
        const lineY = y + h / 2;
        doc.line(x, lineY, x + w, lineY);
      }
    } catch (err) {
      console.error(`Ошибка отрисовки элемента ${el.id}`, err);
    }
  }

  doc.save(`${title || "document"}.pdf`);
};
