// src/hooks/editorHooks/useDragResize.ts
import { useCallback, useRef, useState } from "react";
import type { IEditorElement } from "../utils/types/editor.types";
import {
  MIN_WIDTH,
  MIN_HEIGHT,
  A4_WIDTH,
  A4_HEIGHT,
} from "../utils/constants/editor.constants";

interface DragResizeHook {
  isDragging: boolean;
  isResizing: boolean;
  startDrag: (id: string, offsetX: number, offsetY: number) => void;
  startResize: (id: string, handle: string) => void;
  stopDragResize: () => void;
  handleMouseMove: (
    e: MouseEvent,
    canvasRect: DOMRect,
    zoom: number,
    elements: IEditorElement[],
    selectedId: string | null,
    updateElement: (id: string, upd: Partial<IEditorElement>) => void,
    snapToGrid: (v: number) => number,
    isGridEnabled: boolean,
  ) => void;
  resizeHandle: string;
}

export const useDragResize = (): DragResizeHook => {
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [isResizingState, setIsResizingState] = useState(false);
  const [resizeHandleState, setResizeHandleState] = useState("");

  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeHandle = useRef("");

  const startDrag = useCallback(
    (_id: string, offsetX: number, offsetY: number) => {
      dragOffset.current = { x: offsetX, y: offsetY };
      isDragging.current = true;
      setIsDraggingState(true);
    },
    [],
  );

  const startResize = useCallback((_id: string, handle: string) => {
    resizeHandle.current = handle;
    isResizing.current = true;
    setIsResizingState(true);
    setResizeHandleState(handle);
  }, []);

  const stopDragResize = useCallback(() => {
    isDragging.current = false;
    isResizing.current = false;
    resizeHandle.current = "";

    setIsDraggingState(false);
    setIsResizingState(false);
    setResizeHandleState("");
  }, []);

  const handleMouseMove = useCallback(
    (
      e: MouseEvent,
      canvasRect: DOMRect,
      zoom: number,
      elements: IEditorElement[],
      selectedId: string | null,
      updateElement: (id: string, upd: Partial<IEditorElement>) => void,
      snapToGrid: (v: number) => number,
      isGridEnabled: boolean,
    ) => {
      if (!selectedId || (!isDragging.current && !isResizing.current)) return;

      const el = elements.find((i) => i.id === selectedId);
      if (!el) return;

      const snap = (v: number) => (isGridEnabled ? snapToGrid(v) : v);

      // Координаты мыши относительно канваса (с учетом зума)
      const mouseX = (e.clientX - canvasRect.left) / zoom;
      const mouseY = (e.clientY - canvasRect.top) / zoom;

      // --- ЛОГИКА ПЕРЕТАСКИВАНИЯ ---
      if (isDragging.current) {
        let nx = mouseX - dragOffset.current.x;
        let ny = mouseY - dragOffset.current.y;

        nx = snap(nx);
        ny = snap(ny);

        const constrainedX = Math.max(0, Math.min(nx, A4_WIDTH - el.width));
        const constrainedY = Math.max(0, Math.min(ny, A4_HEIGHT - el.height));

        if (el.x !== constrainedX || el.y !== constrainedY) {
          updateElement(selectedId, { x: constrainedX, y: constrainedY });
        }
      }

      // --- ЛОГИКА ИЗМЕНЕНИЯ РАЗМЕРА ---
      if (isResizing.current) {
        const handle = resizeHandle.current;

        let newX = el.x;
        let newY = el.y;
        let newWidth = el.width;
        let newHeight = el.height;

        // Правый край (e = east)
        if (handle.includes("e")) {
          const desiredWidth = snap(mouseX - el.x);
          newWidth = Math.max(MIN_WIDTH, desiredWidth);
          // Ограничение по правому краю страницы
          if (el.x + newWidth > A4_WIDTH) {
            newWidth = A4_WIDTH - el.x;
          }
        }

        // Нижний край (s = south)
        if (handle.includes("s")) {
          const desiredHeight = snap(mouseY - el.y);
          newHeight = Math.max(MIN_HEIGHT, desiredHeight);
          // Ограничение по высоте (опционально, если нужно)
        }

        // Левый край (w = west)
        if (handle.includes("w")) {
          const rightEdge = el.x + el.width;
          const desiredLeft = snap(mouseX);
          const desiredWidth = rightEdge - desiredLeft;

          if (desiredWidth >= MIN_WIDTH && desiredLeft >= 0) {
            newX = desiredLeft;
            newWidth = desiredWidth;
          } else if (desiredLeft < 0) {
            newX = 0;
            newWidth = snap(rightEdge);
          }
        }

        // Верхний край (n = north)
        if (handle.includes("n")) {
          const bottomEdge = el.y + el.height;
          const desiredTop = snap(mouseY);
          const desiredHeight = bottomEdge - desiredTop;

          if (desiredHeight >= MIN_HEIGHT && desiredTop >= 0) {
            newY = desiredTop;
            newHeight = desiredHeight;
          } else if (desiredTop < 0) {
            newY = 0;
            newHeight = snap(bottomEdge);
          }
        }

        // Применяем изменения
        updateElement(selectedId, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      }
    },
    [],
  );

  return {
    isDragging: isDraggingState,
    isResizing: isResizingState,
    resizeHandle: resizeHandleState,
    startDrag,
    startResize,
    stopDragResize,
    handleMouseMove,
  };
};
