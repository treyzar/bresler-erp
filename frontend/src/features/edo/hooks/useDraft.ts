// src/hooks/editorHooks/useDraft.ts

import { useEffect } from "react";
import type {
  IEditorElement,
  ITextProperties,
} from "../utils/types/editor.types";

interface IUseDraftProps {
  prefill?: string;
  setElements: (els: IEditorElement[]) => void;
  setTitle: (t: string) => void;
  setDescription: (d: string) => void;
  saveToHistory: (els: IEditorElement[]) => void;
}

// Дефолтные свойства текста (можно вынести в constants)
const getDefaultTextProperties = (content: string): ITextProperties => ({
  content,
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
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  paragraphSpacing: 8,
});

export const useDraft = ({
  prefill,
  setElements,
  setTitle,
  setDescription,
  saveToHistory,
}: IUseDraftProps) => {
  useEffect(() => {
    if (prefill) {
      const textEl: IEditorElement = {
        id: `prefill_${Date.now()}`,
        type: "text",
        x: 40,
        y: 40,
        width: 700,
        height: 1000,
        zIndex: 0,
        properties: getDefaultTextProperties(prefill),
      };
      setElements([textEl]);
      saveToHistory([textEl]);
      return; // пропускаем загрузку черновика
    }

    /* Загрузка черновика из localStorage */
    const raw = localStorage.getItem("editor_draft");
    if (!raw) return;

    try {
      const { elements, title, description } = JSON.parse(raw);

      if (elements?.length) {
        // Миграция старых элементов — добавляем недостающие свойства
        const migratedElements = elements.map((el: IEditorElement) => {
          if (el.type === "text") {
            const props = el.properties as ITextProperties;
            return {
              ...el,
              properties: {
                ...props,
                // Добавляем новые свойства если их нет
                textIndent: props.textIndent ?? 0,
                lineHeight: props.lineHeight ?? 1.5,
                letterSpacing: props.letterSpacing ?? 0,
                whiteSpace: props.whiteSpace ?? "pre-wrap",
                wordBreak: props.wordBreak ?? "break-word",
                paragraphSpacing: props.paragraphSpacing ?? 8,
              },
            };
          }
          return el;
        });

        setElements(migratedElements);
        saveToHistory(migratedElements);
      }

      if (title) setTitle(title);
      if (description) setDescription(description);
    } catch (e) {
      console.warn("Failed to parse draft:", e);
    }
  }, [prefill]);
};
