import type { IEditorElement, TElementType } from "../types/editor.types";

type AnyRecord = Record<string, any>;

const TEXT_DEFAULTS = {
  fontFamily: "Inter",
  fontSize: 14,
  color: "#1a1a1a",
  bold: false,
  italic: false,
  underline: false,
  align: "left" as const,
  textIndent: 0,
  lineHeight: 1.5,
  letterSpacing: 0,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  paragraphSpacing: 8,
};

const DIVIDER_DEFAULTS = { thickness: 1, color: "#1a1a1a", style: "solid" as const };
const SIGNATURE_DEFAULTS = { text: "Подпись", fontSize: 16, color: "#1a1a1a" };

function hoistFlatFields(type: TElementType, el: AnyRecord): AnyRecord {
  const { id, type: _t, x, y, width, height, zIndex, properties, ...rest } = el;
  const props: AnyRecord = {};

  if ("content" in rest) props.content = rest.content ?? "";
  if ("text" in rest) props.text = rest.text ?? "";
  if ("fontSize" in rest) props.fontSize = rest.fontSize;
  if ("align" in rest) props.align = rest.align;
  if ("isBold" in rest) props.bold = !!rest.isBold;
  if ("isItalic" in rest) props.italic = !!rest.isItalic;
  if ("bold" in rest) props.bold = !!rest.bold;
  if ("italic" in rest) props.italic = !!rest.italic;
  if ("underline" in rest) props.underline = !!rest.underline;
  if ("color" in rest) props.color = rest.color;
  if ("fontFamily" in rest) props.fontFamily = rest.fontFamily;
  if ("src" in rest) props.src = rest.src;
  if ("alt" in rest) props.alt = rest.alt;
  if ("image" in rest) props.image = rest.image;
  if ("columns" in rest) props.columns = rest.columns;
  if ("cells" in rest) props.cells = rest.cells;
  if ("rows" in rest) props.rows = rest.rows;
  if ("cols" in rest) props.cols = rest.cols;
  if ("data" in rest) props.data = rest.data;
  if ("borderWidth" in rest) props.borderWidth = rest.borderWidth;
  if ("borderColor" in rest) props.borderColor = rest.borderColor;
  if ("cellBg" in rest) props.cellBg = rest.cellBg;
  if ("thickness" in rest) props.thickness = rest.thickness;
  if ("style" in rest) props.style = rest.style;

  if (type === "text") {
    for (const [key, val] of Object.entries(TEXT_DEFAULTS)) {
      if (props[key] === undefined) props[key] = val;
    }
    if (props.content === undefined) props.content = "";
  } else if (type === "signature") {
    for (const [key, val] of Object.entries(SIGNATURE_DEFAULTS)) {
      if (props[key] === undefined) props[key] = val;
    }
  } else if (type === "divider") {
    for (const [key, val] of Object.entries(DIVIDER_DEFAULTS)) {
      if (props[key] === undefined) props[key] = val;
    }
  } else if (type === "image") {
    if (props.src === undefined) props.src = "";
    if (props.alt === undefined) props.alt = "";
  }

  return props;
}

export function normalizeElement(raw: any): IEditorElement {
  const type = raw?.type as TElementType;
  const properties =
    raw && typeof raw.properties === "object" && raw.properties !== null
      ? raw.properties
      : hoistFlatFields(type, raw || {});

  return {
    id: String(raw?.id ?? ""),
    type,
    x: Math.round(Number(raw?.x) || 0),
    y: Math.round(Number(raw?.y) || 0),
    width: Math.round(Number(raw?.width) || 100),
    height: Math.round(Number(raw?.height) || 40),
    zIndex: Number.isFinite(raw?.zIndex) ? Number(raw.zIndex) : 0,
    properties: properties as IEditorElement["properties"],
  };
}

export function normalizeEditorContent(list: any[] | undefined | null): IEditorElement[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((el) => el && typeof el === "object" && el.type)
    .map(normalizeElement);
}

/** Strip non-serializable fields (File handles) before sending to server. */
export function sanitizeForSave(elements: IEditorElement[]): IEditorElement[] {
  return elements.map((el) => {
    const props = { ...(el.properties as AnyRecord) };
    if (el.type === "image" && "file" in props) delete props.file;
    return {
      id: el.id,
      type: el.type,
      x: Math.round(Number(el.x) || 0),
      y: Math.round(Number(el.y) || 0),
      width: Math.round(Number(el.width) || 100),
      height: Math.round(Number(el.height) || 40),
      zIndex: Number.isFinite(el.zIndex) ? el.zIndex : 0,
      properties: props as IEditorElement["properties"],
    };
  });
}
