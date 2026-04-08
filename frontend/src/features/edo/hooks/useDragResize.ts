import { useCallback, useRef, useState } from "react";
import type { IEditorElement } from "../utils/types/editor.types";
import { MIN_WIDTH, MIN_HEIGHT, A4_WIDTH } from "../utils/constants/editor.constants";

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

  const startDrag = useCallback((_id: string, offsetX: number, offsetY: number) => {
    dragOffset.current = { x: offsetX, y: offsetY };
    isDragging.current = true;
    setIsDraggingState(true);
  }, []);

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
      const mouseX = (e.clientX - canvasRect.left) / zoom;
      const mouseY = (e.clientY - canvasRect.top) / zoom;

      if (isDragging.current) {
        let nx = mouseX - dragOffset.current.x;
        let ny = mouseY - dragOffset.current.y;

        nx = snap(Math.max(0, Math.min(nx, A4_WIDTH - el.width)));
        ny = snap(Math.max(0, ny));

        updateElement(selectedId, { x: nx, y: ny });
      }

      if (isResizing.current) {
        const handle = resizeHandle.current;
        let newX = el.x;
        let newY = el.y;
        let newWidth = el.width;
        let newHeight = el.height;

        if (handle.includes("e")) {
          newWidth = snap(Math.max(MIN_WIDTH, Math.min(mouseX - el.x, A4_WIDTH - el.x)));
        }
        if (handle.includes("s")) {
          newHeight = snap(Math.max(MIN_HEIGHT, mouseY - el.y));
        }
        if (handle.includes("w")) {
          const rightEdge = el.x + el.width;
          const desiredLeft = snap(Math.max(0, mouseX));
          const desiredWidth = rightEdge - desiredLeft;
          if (desiredWidth >= MIN_WIDTH) {
            newX = desiredLeft;
            newWidth = desiredWidth;
          }
        }
        if (handle.includes("n")) {
          const bottomEdge = el.y + el.height;
          const desiredTop = snap(Math.max(0, mouseY));
          const desiredHeight = bottomEdge - desiredTop;
          if (desiredHeight >= MIN_HEIGHT) {
            newY = desiredTop;
            newHeight = desiredHeight;
          }
        }

        updateElement(selectedId, { x: newX, y: newY, width: newWidth, height: newHeight });
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
