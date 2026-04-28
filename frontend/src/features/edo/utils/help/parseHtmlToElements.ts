import type {
  IEditorElement,
  ICellStyle,
  ITableCell,
  ITableColumn,
} from "../types/editor.types";
import { generateId } from "./generateID";

type StyleMap = Record<string, string>;

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

const DEFAULT_TEXT_HEIGHT = 40;
const DEFAULT_TEXT_WIDTH = 300;
const DEFAULT_IMAGE_WIDTH = 200;
const DEFAULT_IMAGE_HEIGHT = 120;
const DEFAULT_DIVIDER_WIDTH = 300;
const DEFAULT_TABLE_COL_WIDTH = 120;
const DEFAULT_TABLE_ROW_HEIGHT = 40;

type MediaSource = {
  src: string;
  alt: string;
  style: StyleMap;
  widthHint?: string | null;
  heightHint?: string | null;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseNumber(v: string | null | undefined): number {
  if (!v) return 0;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function parseLength(
  value: string | null | undefined,
  options?: {
    fontSize?: number;
    relativeTo?: number;
  }
): number {
  if (!value) return 0;

  const raw = value.trim().toLowerCase();
  if (!raw || raw === "auto" || raw === "normal") return 0;

  const n = parseNumber(raw);
  if (!Number.isFinite(n)) return 0;

  if (raw.endsWith("px")) return n;
  if (raw.endsWith("pt")) return n * (96 / 72);
  if (raw.endsWith("rem")) return n * 16;
  if (raw.endsWith("em")) return n * (options?.fontSize || 16);
  if (raw.endsWith("%")) return ((options?.relativeTo || 0) * n) / 100;

  return n;
}

function normalizeColor(value: string | null | undefined, fallback = "#000000"): string {
  if (!value) return fallback;

  const raw = value.trim();
  if (!raw) return fallback;

  if (raw.startsWith("#")) {
    if (raw.length === 4) {
      const c = raw
        .slice(1)
        .split("")
        .map((ch) => ch + ch)
        .join("");
      return `#${c}`.toLowerCase();
    }

    if (raw.length === 7) {
      return raw.toLowerCase();
    }
  }

  const rgb = raw.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => Number.parseFloat(p.trim()));
    if (parts.length >= 3) {
      const r = clamp(Math.round(parts[0] || 0), 0, 255);
      const g = clamp(Math.round(parts[1] || 0), 0, 255);
      const b = clamp(Math.round(parts[2] || 0), 0, 255);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
        .toString(16)
        .padStart(2, "0")}`;
    }
  }

  if (typeof document !== "undefined") {
    const probe = document.createElement("span");
    probe.style.color = raw;
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    document.body.removeChild(probe);

    const parsed = normalizeColor(computed, "");
    if (parsed) return parsed;
  }

  return fallback;
}

function parseStyleAttr(styleText: string | null | undefined): StyleMap {
  const out: StyleMap = {};
  if (!styleText) return out;

  for (const part of styleText.split(";")) {
    const idx = part.indexOf(":");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (!key || !val) continue;
    out[key] = val;
  }

  return out;
}

function extractBackgroundImageSrc(style: StyleMap): string {
  const bg = style["background-image"] || style["background"] || "";
  if (!bg) return "";
  const m = bg.match(/url\((['"]?)(.*?)\1\)/i);
  return m?.[2]?.trim() || "";
}

function parseSvgSizeFromViewBox(svg: Element): { width: number; height: number } | null {
  const viewBox = svg.getAttribute("viewBox");
  if (!viewBox) return null;
  const parts = viewBox.split(/[\s,]+/).map((x) => Number.parseFloat(x));
  if (parts.length !== 4) return null;
  const w = parts[2];
  const h = parts[3];
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { width: w, height: h };
}

function toSvgDataUri(svgNode: Element): string {
  const rawSvg = svgNode.outerHTML;
  return `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
}

function firstSrcFromSrcSet(srcset: string | null): string {
  if (!srcset) return "";
  const first = srcset.split(",")[0]?.trim() || "";
  if (!first) return "";
  return first.split(/\s+/)[0] || "";
}

function resolveMediaSource(node: Element): MediaSource | null {
  const tag = node.tagName.toLowerCase();
  const nodeStyle = parseStyleAttr(node.getAttribute("style"));
  const bgSrc = extractBackgroundImageSrc(nodeStyle);
  if (bgSrc) {
    return {
      src: bgSrc,
      alt: node.getAttribute("aria-label") || node.getAttribute("title") || "",
      style: nodeStyle,
      widthHint: nodeStyle.width || node.getAttribute("width"),
      heightHint: nodeStyle.height || node.getAttribute("height"),
    };
  }

  const mediaNode =
    tag === "img" || tag === "svg" || tag === "object" || tag === "embed"
      ? node
      : (node.querySelector("img,svg,object,embed") as Element | null);

  if (!mediaNode) return null;
  const mediaTag = mediaNode.tagName.toLowerCase();
  const mediaStyle = parseStyleAttr(mediaNode.getAttribute("style"));

  if (mediaTag === "img") {
    const src =
      mediaNode.getAttribute("src") ||
      mediaNode.getAttribute("data-src") ||
      mediaNode.getAttribute("data-original") ||
      firstSrcFromSrcSet(mediaNode.getAttribute("srcset"));

    if (!src) return null;
    return {
      src,
      alt: mediaNode.getAttribute("alt") || "",
      style: mergeStyles(nodeStyle, mediaStyle),
      widthHint: mediaStyle.width || mediaNode.getAttribute("width"),
      heightHint: mediaStyle.height || mediaNode.getAttribute("height"),
    };
  }

  if (mediaTag === "svg") {
    const vb = parseSvgSizeFromViewBox(mediaNode);
    return {
      src: toSvgDataUri(mediaNode),
      alt: mediaNode.getAttribute("aria-label") || mediaNode.getAttribute("title") || "svg",
      style: mergeStyles(nodeStyle, mediaStyle),
      widthHint: mediaStyle.width || mediaNode.getAttribute("width") || String(vb?.width || ""),
      heightHint: mediaStyle.height || mediaNode.getAttribute("height") || String(vb?.height || ""),
    };
  }

  if (mediaTag === "object") {
    const type = (mediaNode.getAttribute("type") || "").toLowerCase();
    const data = mediaNode.getAttribute("data") || "";
    if (!data) return null;
    if (type && !type.startsWith("image/")) return null;
    return {
      src: data,
      alt: mediaNode.getAttribute("aria-label") || mediaNode.getAttribute("title") || "",
      style: mergeStyles(nodeStyle, mediaStyle),
      widthHint: mediaStyle.width || mediaNode.getAttribute("width"),
      heightHint: mediaStyle.height || mediaNode.getAttribute("height"),
    };
  }

  if (mediaTag === "embed") {
    const src = mediaNode.getAttribute("src") || "";
    const type = (mediaNode.getAttribute("type") || "").toLowerCase();
    if (!src) return null;
    if (type && !type.startsWith("image/")) return null;
    return {
      src,
      alt: mediaNode.getAttribute("aria-label") || mediaNode.getAttribute("title") || "",
      style: mergeStyles(nodeStyle, mediaStyle),
      widthHint: mediaStyle.width || mediaNode.getAttribute("width"),
      heightHint: mediaStyle.height || mediaNode.getAttribute("height"),
    };
  }

  return null;
}

function mergeStyles(...styles: StyleMap[]): StyleMap {
  return styles.reduce<StyleMap>((acc, curr) => ({ ...acc, ...curr }), {});
}

function lineStyleFromMap(style: StyleMap): {
  thickness: number;
  color: string;
  style: "solid" | "dashed" | "dotted";
} {
  const borderTop = style["border-top"] || "";
  const borderTopParts = borderTop.split(/\s+/).filter(Boolean);

  const thickness =
    parseLength(style["border-top-width"]) ||
    parseLength(borderTopParts.find((p) => /(px|pt|em|rem|\d)/.test(p))) ||
    1;

  const borderStyleCandidate = (
    style["border-top-style"] ||
    borderTopParts.find((p) => ["solid", "dashed", "dotted"].includes(p)) ||
    "solid"
  ).toLowerCase();

  const color = normalizeColor(
    style["border-top-color"] ||
      borderTopParts.find((p) => p.startsWith("#") || p.startsWith("rgb") || /^[a-z]+$/i.test(p)),
    "#000000"
  );

  const safeStyle: "solid" | "dashed" | "dotted" =
    borderStyleCandidate === "dashed"
      ? "dashed"
      : borderStyleCandidate === "dotted"
        ? "dotted"
        : "solid";

  return {
    thickness: Math.max(1, Math.round(thickness)),
    style: safeStyle,
    color,
  };
}

function resolveRect(style: StyleMap, flowY: number): Rect {
  const fontSize = parseLength(style["font-size"]) || 14;
  const width = parseLength(style.width, { fontSize });
  const height = parseLength(style.height, { fontSize });

  const x = parseLength(style.left, { fontSize });
  const y = parseLength(style.top, { fontSize });

  const position = (style.position || "").toLowerCase();
  const isAbsolute = position === "absolute" || position === "fixed";

  return {
    x: Math.round(x),
    y: Math.round(isAbsolute ? y : flowY),
    width: Math.round(width),
    height: Math.round(height),
    zIndex: Math.round(parseNumber(style["z-index"]) || 0),
  };
}

function readNodeText(node: Element): string {
  const clone = node.cloneNode(true) as Element;

  clone.querySelectorAll("script,style").forEach((n) => n.remove());

  clone.querySelectorAll("br").forEach((br) => {
    br.replaceWith("\n");
  });

  const raw = (clone.textContent || "").replace(/\u00a0/g, " ");
  return raw
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trimEnd())
    .join("\n")
    .trim();
}

function extractTextProperties(node: Element): IEditorElement["properties"] {
  const parentStyle = parseStyleAttr(node.getAttribute("style"));
  const firstTextContainer = node.querySelector("p,span") || node;
  const childStyle = parseStyleAttr(firstTextContainer.getAttribute("style"));
  const style = mergeStyles(parentStyle, childStyle);

  const fontSize = Math.max(8, Math.round(parseLength(style["font-size"]) || 14));
  const fontWeight = (style["font-weight"] || "").toLowerCase();
  const fontStyle = (style["font-style"] || "").toLowerCase();
  const textDecoration = (style["text-decoration"] || "").toLowerCase();

  const lineHeightRaw = style["line-height"] || "1.5";
  const lineHeight = lineHeightRaw.endsWith("px")
    ? parseLength(lineHeightRaw, { fontSize }) / fontSize
    : parseNumber(lineHeightRaw) || 1.5;

  const alignRaw = (style["text-align"] || "left").toLowerCase();
  const align =
    alignRaw === "center" || alignRaw === "right" || alignRaw === "justify"
      ? alignRaw
      : "left";

  const whiteSpaceRaw = (style["white-space"] || "pre-wrap").toLowerCase();
  const whiteSpace =
    whiteSpaceRaw === "normal" ||
    whiteSpaceRaw === "nowrap" ||
    whiteSpaceRaw === "pre-line" ||
    whiteSpaceRaw === "pre-wrap"
      ? whiteSpaceRaw
      : "pre-wrap";

  const wordBreakRaw = (style["word-break"] || "break-word").toLowerCase();
  const wordBreak =
    wordBreakRaw === "normal" ||
    wordBreakRaw === "break-all" ||
    wordBreakRaw === "break-word" ||
    wordBreakRaw === "keep-all"
      ? wordBreakRaw
      : "break-word";

  return {
    content: readNodeText(node),
    fontFamily: style["font-family"] || "Inter",
    fontSize,
    color: normalizeColor(style.color, "#000000"),
    bold: fontWeight === "bold" || parseNumber(fontWeight) >= 600,
    italic: fontStyle === "italic" || fontStyle === "oblique",
    underline: textDecoration.includes("underline"),
    align,
    textIndent: Math.round(parseLength(style["text-indent"], { fontSize })),
    lineHeight: Number(lineHeight.toFixed(2)),
    letterSpacing: Math.round(parseLength(style["letter-spacing"], { fontSize })),
    whiteSpace,
    wordBreak,
    paragraphSpacing: Math.round(
      parseLength(style["margin-bottom"], { fontSize }) || 8
    ),
  };
}

function getCellStyle(cell: Element, tableDefaults: {
  borderWidth: number;
  borderColor: string;
  cellBg: string;
}): ICellStyle {
  const style = parseStyleAttr(cell.getAttribute("style"));

  return {
    borderWidth: Math.max(1, Math.round(parseLength(style["border-width"]) || tableDefaults.borderWidth)),
    borderColor: normalizeColor(style["border-color"], tableDefaults.borderColor),
    backgroundColor: style.background ? style.background : tableDefaults.cellBg,
    color: normalizeColor(style.color, "#000000"),
    fontSize: Math.max(8, Math.round(parseLength(style["font-size"]) || 14)),
    fontWeight: (() => {
      const fw = (style["font-weight"] || "normal").toLowerCase();
      return fw === "bold" || parseNumber(fw) >= 600 ? "bold" : "normal";
    })(),
    textAlign: (() => {
      const ta = (style["text-align"] || "left").toLowerCase();
      if (ta === "center" || ta === "right") return ta;
      return "left";
    })(),
  };
}

function parseTable(node: Element, rect: Rect): IEditorElement | null {
  const table = node.tagName.toLowerCase() === "table" ? node : node.querySelector("table");
  if (!table) return null;

  const tableStyle = parseStyleAttr(table.getAttribute("style"));
  const defaults = {
    borderWidth: Math.max(1, Math.round(parseLength(tableStyle["border-width"]) || 1)),
    borderColor: normalizeColor(tableStyle["border-color"], "#000000"),
    cellBg: tableStyle.background || "transparent",
  };

  const rows = Array.from(table.querySelectorAll("tr"));
  if (!rows.length) return null;

  const colsCount = rows.reduce((maxCols, row) => {
    const cols = Array.from(row.children)
      .filter((n) => n.tagName.toLowerCase() === "td" || n.tagName.toLowerCase() === "th")
      .reduce((sum, cell) => sum + (Number.parseInt(cell.getAttribute("colspan") || "1", 10) || 1), 0);
    return Math.max(maxCols, cols);
  }, 0);

  const safeCols = Math.max(1, colsCount);

  const matrix: Array<Array<ITableCell | null>> = [];
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    if (!matrix[r]) matrix[r] = Array(safeCols).fill(null);

    let c = 0;
    const cells = Array.from(row.children).filter(
      (n) => n.tagName.toLowerCase() === "td" || n.tagName.toLowerCase() === "th"
    );

    for (const cell of cells) {
      while (matrix[r][c]) c += 1;

      const rowSpan = Math.max(1, Number.parseInt(cell.getAttribute("rowspan") || "1", 10) || 1);
      const colSpan = Math.max(1, Number.parseInt(cell.getAttribute("colspan") || "1", 10) || 1);

      const cellValue: ITableCell = {
        id: generateId(),
        content: readNodeText(cell),
        rowSpan,
        colSpan,
        style: getCellStyle(cell, defaults),
      };

      if (c < safeCols) {
        matrix[r][c] = cellValue;
      }

      for (let rr = r; rr < r + rowSpan; rr += 1) {
        if (!matrix[rr]) matrix[rr] = Array(safeCols).fill(null);
        for (let cc = c; cc < c + colSpan; cc += 1) {
          if (rr === r && cc === c) continue;
          if (cc < safeCols) matrix[rr][cc] = null;
        }
      }

      c += colSpan;
    }
  }

  const columns: ITableColumn[] = Array.from({ length: safeCols }).map((_, idx) => {
    const colEl = table.querySelectorAll("col")[idx] as Element | undefined;
    const colStyle = parseStyleAttr(colEl?.getAttribute("style"));
    const colWidth = parseLength(colStyle.width || colEl?.getAttribute("width"));

    if (colWidth > 0) {
      return { width: Math.round(colWidth) };
    }

    const tableWidth = rect.width || safeCols * DEFAULT_TABLE_COL_WIDTH;
    return { width: Math.round(tableWidth / safeCols) };
  });

  const legacyData: string[][] = matrix.map((row) =>
    row.map((cell) => (cell ? cell.content : ""))
  );

  const legacyColors: string[][] = matrix.map((row) =>
    row.map((cell) => normalizeColor(cell?.style?.color, "#000000"))
  );

  const width = rect.width || columns.reduce((sum, col) => sum + col.width, 0) || safeCols * DEFAULT_TABLE_COL_WIDTH;
  const height = rect.height || Math.max(rows.length * DEFAULT_TABLE_ROW_HEIGHT, DEFAULT_TABLE_ROW_HEIGHT * 2);

  return {
    id: generateId(),
    type: "table",
    x: rect.x,
    y: rect.y,
    width: Math.round(width),
    height: Math.round(height),
    zIndex: rect.zIndex,
    properties: {
      rows: matrix.length,
      cols: safeCols,
      borderWidth: defaults.borderWidth,
      borderColor: defaults.borderColor,
      cellBg: defaults.cellBg,
      data: legacyData,
      cellTextColors: legacyColors,
      cells: matrix,
      columns,
    },
  } as IEditorElement;
}

function parseImage(node: Element, rect: Rect): IEditorElement | null {
  const source = resolveMediaSource(node);
  if (!source || !source.src) return null;

  const { src, alt, style, widthHint, heightHint } = source;
  const className = node.getAttribute("class") || "";
  const lowered = `${alt} ${className} ${src}`.toLowerCase();
  const isSignature = /signature|подпись|sign/.test(lowered);

  const width =
    rect.width ||
    parseLength(widthHint) ||
    parseLength(style.width) ||
    DEFAULT_IMAGE_WIDTH;

  const height =
    rect.height ||
    parseLength(heightHint) ||
    parseLength(style.height) ||
    DEFAULT_IMAGE_HEIGHT;

  if (isSignature) {
    return {
      id: generateId(),
      type: "signature",
      x: rect.x,
      y: rect.y,
      width: Math.round(width),
      height: Math.round(height),
      zIndex: rect.zIndex,
      properties: {
        image: src,
        text: "",
        fontSize: 16,
        color: "#000000",
      },
    } as IEditorElement;
  }

  return {
    id: generateId(),
    type: "image",
    x: rect.x,
    y: rect.y,
    width: Math.round(width),
    height: Math.round(height),
    zIndex: rect.zIndex,
    properties: {
      src,
      alt,
    },
  } as IEditorElement;
}

function parseDivider(node: Element, rect: Rect): IEditorElement {
  const nodeStyle = parseStyleAttr(node.getAttribute("style"));
  const hr = node.tagName.toLowerCase() === "hr" ? node : node.querySelector("hr");
  const hrStyle = parseStyleAttr(hr?.getAttribute("style"));

  const merged = mergeStyles(nodeStyle, hrStyle);
  const line = lineStyleFromMap(merged);

  return {
    id: generateId(),
    type: "divider",
    x: rect.x,
    y: rect.y,
    width: Math.round(rect.width || DEFAULT_DIVIDER_WIDTH),
    height: Math.round(rect.height || Math.max(12, line.thickness + 8)),
    zIndex: rect.zIndex,
    properties: line,
  } as IEditorElement;
}

function isDividerNode(node: Element): boolean {
  if (node.tagName.toLowerCase() === "hr") return true;

  const hasDirectHr = Array.from(node.children).some(
    (c) => c.tagName.toLowerCase() === "hr"
  );
  if (hasDirectHr) return true;

  const style = parseStyleAttr(node.getAttribute("style"));
  const borderTop = style["border-top"] || "";
  return /solid|dashed|dotted/.test(borderTop) && parseLength(style["border-top-width"]) > 0;
}

function isLikelyTextNode(node: Element): boolean {
  const tag = node.tagName.toLowerCase();
  if (["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"].includes(tag)) {
    return true;
  }

  if (tag === "div") {
    const hasStructuralChildren = Array.from(node.children).some((child) => {
      const ctag = child.tagName.toLowerCase();
      return ["table", "img", "svg", "object", "embed", "hr"].includes(ctag);
    });
    return !hasStructuralChildren;
  }

  return false;
}

function pickContainer(doc: Document): Element {
  return (
    doc.querySelector(".container") ||
    doc.querySelector(".canvas-print") ||
    doc.body
  );
}

export function parseHtmlToElements(html: string): IEditorElement[] {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const container = pickContainer(doc);

    const elements: IEditorElement[] = [];
    let flowY = 0;

    const getChildren = (root: Element): Element[] => Array.from(root.children).filter((node): node is Element => {
      const tag = node.tagName.toLowerCase();
      if (["script", "style", "meta", "link"].includes(tag)) return false;
      return true;
    });

    const pushElement = (el: IEditorElement) => {
      elements.push(el);
      flowY = Math.max(flowY, el.y + el.height + 8);
    };

    const walk = (node: Element) => {
      const style = parseStyleAttr(node.getAttribute("style"));
      const rect = resolveRect(style, flowY);

      if (isDividerNode(node)) {
        const divider = parseDivider(node, rect);
        pushElement(divider);
        return;
      }

      const table = parseTable(node, rect);
      if (table) {
        pushElement(table);
        return;
      }

      const tag = node.tagName.toLowerCase();
      const hasDirectImageChild = Array.from(node.children).some(
        (child) => ["img", "svg", "object", "embed"].includes(child.tagName.toLowerCase())
      );
      const textContent = readNodeText(node);
      const nodeStyle = parseStyleAttr(node.getAttribute("style"));
      const shouldParseAsImage =
        ["img", "svg", "object", "embed"].includes(tag) ||
        (hasDirectImageChild && !textContent.trim()) ||
        !!extractBackgroundImageSrc(nodeStyle);

      if (shouldParseAsImage) {
        const image = parseImage(node, rect);
        if (image) {
          pushElement(image);
          return;
        }
      }

      if (isLikelyTextNode(node)) {
        const textProps = extractTextProperties(node) as Record<string, unknown> & {
          content?: string
          fontSize?: number
          lineHeight?: number
        }
        if (textProps.content) {
          const fallbackHeight = Math.max(
            DEFAULT_TEXT_HEIGHT,
            Math.ceil(textProps.content.split("\n").length * textProps.fontSize * (textProps.lineHeight || 1.4)) + 16
          );

          const textEl = {
            id: generateId(),
            type: "text",
            x: rect.x,
            y: rect.y,
            width: Math.round(rect.width || DEFAULT_TEXT_WIDTH),
            height: Math.round(rect.height || fallbackHeight),
            zIndex: rect.zIndex,
            properties: textProps,
          } as IEditorElement;

          pushElement(textEl);
          return;
        }
      }

      for (const child of getChildren(node)) {
        walk(child);
      }
    };

    for (const node of getChildren(container)) {
      walk(node);
    }

    return elements.sort((a, b) => (a.y - b.y) || (a.x - b.x) || (a.zIndex - b.zIndex));
  } catch {
    return [];
  }
}

export default parseHtmlToElements;
