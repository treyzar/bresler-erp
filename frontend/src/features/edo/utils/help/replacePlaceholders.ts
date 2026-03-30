import type {
  IEditorElement,
  ITextProperties,
  ITableProperties,
  ISignatureProperties,
} from "../types/editor.types";

/**
 * Заменяет плейсхолдеры вида {{key}} в строке на значения из объекта data
 */
export const replacePlaceholdersInString = (
  text: string,
  data: Record<string, string>,
): string => {
  let result = text;
  Object.entries(data).forEach(([key, value]) => {
    // Используем RegExp с флагом 'g' для замены всех вхождений
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, "g");
    result = result.replace(regex, value || "");
  });
  return result;
};

/**
 * Заменяет плейсхолдеры во всех элементах редактора
 */
export const replacePlaceholdersInElements = (
  elements: IEditorElement[],
  data: Record<string, string>,
): IEditorElement[] => {
  return elements.map((el) => {
    if (el.type === "text") {
      const p = el.properties as ITextProperties;
      if (p.content) {
        return {
          ...el,
          properties: {
            ...p,
            content: replacePlaceholdersInString(p.content, data),
          },
        };
      }
    } else if (el.type === "table") {
      const p = el.properties as ITableProperties;
      if (p.data) {
        return {
          ...el,
          properties: {
            ...p,
            data: p.data.map((row) =>
              row.map((cell) => replacePlaceholdersInString(cell, data)),
            ),
          },
        };
      }
    } else if (el.type === "signature") {
      const p = el.properties as ISignatureProperties;
      if (p.text) {
        return {
          ...el,
          properties: {
            ...p,
            text: replacePlaceholdersInString(p.text, data),
          },
        };
      }
    }
    return el;
  });
};
