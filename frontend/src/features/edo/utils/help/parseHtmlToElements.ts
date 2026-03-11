import type { IEditorElement } from "../types/editor.types";
import { generateId } from "./generateID";

function parsePx(v: string | null): number {
  if (!v) return 0;
  const m = v.match(/(-?\d+(?:\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : 0;
}

export function parseHtmlToElements(html: string): IEditorElement[] {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const container = doc.querySelector(".container") || doc.body;
    const els: IEditorElement[] = [];

    // find absolutely positioned child divs
    const nodes = Array.from(container.querySelectorAll("div"));
    nodes.forEach((node) => {
      const style = node.getAttribute("style") || "";
      const left = style.match(/left:\s*([0-9px.%-]+)/)?.[1] || null;
      const top = style.match(/top:\s*([0-9px.%-]+)/)?.[1] || null;
      const width = style.match(/width:\s*([0-9px.%-]+)/)?.[1] || null;
      const height = style.match(/height:\s*([0-9px.%-]+)/)?.[1] || null;

      const x = parsePx(left);
      const y = parsePx(top);
      const w = parsePx(width) || 100;
      const h = parsePx(height) || 30;

      const img = node.querySelector("img");
      const p = node.querySelector("p") || node.querySelector("span") || null;

      if (img) {
        els.push({
          id: generateId(),
          type: "image",
          x,
          y,
          width: w,
          height: h,
          zIndex: 0,
          properties: {
            src: img.getAttribute("src") || "",
            alt: img.getAttribute("alt") || "",
          },
        } as any);
        return;
      }

      if (p) {
        els.push({
          id: generateId(),
          type: "text",
          x,
          y,
          width: w,
          height: h,
          zIndex: 0,
          properties: {
            content: p.textContent || "",
            fontFamily: "Inter",
            fontSize: 14,
            color: "#000000",
            bold: false,
            italic: false,
            underline: false,
            align: "left",
          },
        } as any);
        return;
      }

      // empty divs could be dividers
      const hr = node.querySelector("hr");
      if (hr) {
        els.push({
          id: generateId(),
          type: "divider",
          x,
          y,
          width: w,
          height: h,
          zIndex: 0,
          properties: { thickness: 1, style: "solid", color: "#000" },
        } as any);
        return;
      }
    });

    return els;
  } catch (e) {
    return [];
  }
}

export default parseHtmlToElements;
