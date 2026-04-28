import { useEffect } from "react";
import type { IEditorElement } from "../utils/types/editor.types";

interface IUseKeyboardProps {
  selectedId: string | null;
  elements: IEditorElement[];
  setElements: (els: IEditorElement[]) => void;
  saveToHistory: (els: IEditorElement[]) => void;
  setSelectedId: (id: string | null) => void;
  deleteElement: (id: string) => void;
  undo: () => IEditorElement[];
  redo: () => IEditorElement[];
}

export const useKeyboard = ({
  selectedId,
  elements,
  setElements,
  saveToHistory,
  setSelectedId,
  deleteElement,
  undo,
  redo,
}: IUseKeyboardProps): void => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Игнорируем ввод в текстовые поля
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      // --- UNDO (Ctrl + Z) ---
      if (isCtrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        const res = undo();
        if (res) {
          setElements(res);
          setSelectedId(null);
        }
      }

      // --- REDO (Ctrl + Y или Ctrl + Shift + Z) ---
      if (
        (isCtrl && e.key.toLowerCase() === "y") ||
        (isCtrl && e.key.toLowerCase() === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        const res = redo();
        if (res) {
          setElements(res);
          setSelectedId(null);
        }
      }

      // --- DELETE ---
      if (e.key === "Delete" && selectedId) {
        e.preventDefault();
        deleteElement(selectedId);
      }

      // --- COPY (Ctrl + C) ---
      if (isCtrl && e.key.toLowerCase() === "c" && selectedId) {
        const el = elements.find((i) => i.id === selectedId);
        if (el) navigator.clipboard.writeText(JSON.stringify(el));
      }

      // --- PASTE (Ctrl + V) ---
      if (isCtrl && e.key.toLowerCase() === "v") {
        navigator.clipboard.readText().then((str) => {
          try {
            const copied: IEditorElement = JSON.parse(str);
            if (!copied.id || !copied.type) return;

            const newEl: IEditorElement = {
              ...copied,
              id: `el_${Date.now()}`,
              x: copied.x + 20,
              y: copied.y + 20,
            };
            const next = [...elements, newEl];
            setElements(next);
            saveToHistory(next);
            setSelectedId(newEl.id);
          } catch {
            // Clipboard payload wasn't a serialised editor element — ignore.
          }
        });
      }

      // --- СТРЕЛКИ (Перемещение) ---
      if (
        selectedId &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1; // Shift = быстро, без = медленно

        const next = elements.map((el) => {
          if (el.id !== selectedId) return el;

          let { x, y } = el;
          switch (e.key) {
            case "ArrowLeft":
              x -= step;
              break;
            case "ArrowRight":
              x += step;
              break;
            case "ArrowUp":
              y -= step;
              break;
            case "ArrowDown":
              y += step;
              break;
          }
          return { ...el, x, y };
        });

        setElements(next);
        // Не сохраняем в историю каждый пиксель движения стрелками, чтобы не засорять Undo
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    selectedId,
    elements,
    setElements,
    saveToHistory,
    setSelectedId,
    deleteElement,
    undo,
    redo,
  ]);
};
