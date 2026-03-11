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
