import type { IEditorElement } from "../types/editor.types";

export function generateHTMLFromElements(
  elements: IEditorElement[],
  title: string
): string {
  const els = elements
    .map((el) => {
      const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px`;
      if (el.type === "text") {
        const p = el.properties as any;
        return `<div style="${style}"><p style="margin:0;font-family:${
          p.fontFamily
        };font-size:${p.fontSize}px;color:${p.color};font-weight:${
          p.bold ? "bold" : "normal"
        };font-style:${p.italic ? "italic" : "normal"};text-decoration:${
          p.underline ? "underline" : "none"
        };text-align:${p.align}">${p.content}</p></div>`;
      }
      if (el.type === "image") {
        const p = el.properties as any;
        return `<div style="${style}"><img src="${p.src}" alt="${p.alt}" style="width:100%;height:100%;object-fit:cover"></div>`;
      }
      if (el.type === "table") {
        const p = el.properties as any;
        const isNewStructure = !!(p.cells && p.columns);
        
        if (!isNewStructure) {
          // Старая структура
          let rowsHtml = "";
          for (let i = 0; i < (p.rows || 0); i++) {
            let cellsHtml = "";
            for (let j = 0; j < (p.cols || 0); j++) {
              const cellColor = p.cellTextColors?.[i]?.[j] || "#000000";
              cellsHtml += `<td style="border:${p.borderWidth || 1}px solid ${p.borderColor || "#000"};padding:8px;background:${p.cellBg};color:${cellColor}">${p.data?.[i]?.[j] || ""}</td>`;
            }
            rowsHtml += `<tr>${cellsHtml}</tr>`;
          }
          return `<div style="${style}"><table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed">${rowsHtml}</table></div>`;
        }

        // Новая структура
        const colGroup = `<colgroup>${p.columns.map((c: any) => `<col style="width:${c.width}px">`).join("")}</colgroup>`;
        const rowsHtml = p.cells.map((row: any[]) => {
          const cellsHtml = row.map((cell: any) => {
            if (!cell) return "";
            const s = cell.style || {};
            const cellStyle = [
              `border:${s.borderWidth ?? p.borderWidth}px solid ${s.borderColor ?? p.borderColor}`,
              `padding:8px`,
              `background:${s.backgroundColor ?? p.cellBg}`,
              `color:${s.color || "#000000"}`,
              s.fontSize ? `font-size:${s.fontSize}px` : "",
              `font-weight:${s.fontWeight || "normal"}`,
              `text-align:${s.textAlign || "left"}`,
              `word-break:break-all`,
              `vertical-align:top`
            ].filter(Boolean).join(";");
            
            return `<td rowspan="${cell.rowSpan || 1}" colspan="${cell.colSpan || 1}" style="${cellStyle}">${cell.content}</td>`;
          }).join("");
          return `<tr>${cellsHtml}</tr>`;
        }).join("");

        return `<div style="${style}"><table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed">${colGroup}<tbody>${rowsHtml}</tbody></table></div>`;
      }
      return "";
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;margin:0;padding:20px;position:relative;width:794px;min-height:1123px;background:white;}
    .container{position:relative;width:100%;height:100%;}
    *{box-sizing:border-box;}
    @media print{body{width:210mm;min-height:297mm;}}
  </style>
</head>
<body>
  <div class="container">${els}</div>
</body>
</html>`;
}
