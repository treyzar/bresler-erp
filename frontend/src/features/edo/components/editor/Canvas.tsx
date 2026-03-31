// src/components/editor/Canvas.tsx

import React, { forwardRef, useMemo } from "react";
import type { IEditorElement } from "../../utils/types/editor.types";
import { GRID_SIZE } from "../../utils/constants/editor.constants";
import { ElementRenderer } from "./ElementRenderer";
import ResizeHandles from "./ResizeHandles";

interface CanvasProps {
  elements: IEditorElement[];
  selectedId: string | null;
  gridVisible: boolean;
  zoom: number;
  gridStep?: number;
  onSelect: (id: string | null) => void;
  onElementMoveStart: (id: string, offsetX: number, offsetY: number) => void;
  onElementResizeStart: (id: string, handle: string) => void;
  onUpdateProp: (id: string, props: any) => void;
  onImageUpload: (file: File) => void;
  onEditSignature?: (id: string) => void;
  currentPage?: number;
  templateType?: "PDF" | "HTML" | "DOCX";
}

const PAGE_HEIGHT = 1123; // A4 px height
const PAGE_WIDTH = 794; // A4 px width

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(function CanvasComponent(
  {
    elements,
    selectedId,
    gridVisible,
    zoom,
    gridStep = GRID_SIZE,
    onSelect,
    onElementMoveStart,
    onElementResizeStart,
    onUpdateProp,
    onImageUpload,
    onEditSignature,
    currentPage = 0,
    templateType = "PDF",
  },
  ref
) {
  // 1. Ширина полотна (растягивается под элементы)
  const canvasWidth = useMemo(() => {
    if (elements.length === 0) return PAGE_WIDTH;
    const maxX = Math.max(...elements.map((el) => {
      let w = el.width;
      if (el.type === "table") {
         const props = el.properties as any;
         const cols = props.cols || 1;
         w = Math.max(w, cols * 80); 
      }
      return el.x + w;
    }));
    return Math.max(PAGE_WIDTH, maxX + 40);
  }, [elements]);

  // 2. Высота полотна (только для HTML, так как PDF использует фиксированную высоту PAGE_HEIGHT для страницы)
  const canvasHeightHTML = useMemo(() => {
    if (elements.length === 0) return PAGE_HEIGHT;
    const maxY = Math.max(...elements.map((el) => {
      let h = el.height;
      if (el.type === "table") {
         const props = el.properties as any;
         const rows = props.rows || 1;
         h = Math.max(h, rows * 40);
      }
      return el.y + h;
    }));
    return Math.max(PAGE_HEIGHT, maxY + 40);
  }, [elements]);

  const isPaginated = templateType !== "HTML";

  // Отфильтровываем элементы, видимые на текущей странице (для PDF/DOCX)
  const visibleElements = useMemo(() => {
    if (!isPaginated) return elements;
    return elements.filter(el => {
      const elPageMatch = Math.floor(el.y / PAGE_HEIGHT);
      return elPageMatch === currentPage;
    });
  }, [elements, currentPage, isPaginated]);

  // Хэндлеры
  const handleElementMouseDown = (
    e: React.MouseEvent,
    element: IEditorElement,
    handle?: string
  ) => {
    const canvasEl = (e.currentTarget as HTMLElement).closest(
      ".canvas-layer"
    ) as HTMLElement | null;
    const canvasRect = canvasEl?.getBoundingClientRect();
    
    // Если это пагинированный вид, корректируем Y относительно страницы
    const visualY = isPaginated ? element.y - currentPage * PAGE_HEIGHT : element.y;

    const offsetX = canvasRect
      ? (e.clientX - canvasRect.left) / zoom - element.x
      : 0;
    const offsetY = canvasRect
      ? (e.clientY - canvasRect.top) / zoom - visualY
      : 0;

    if (handle) {
      e.stopPropagation();
      onElementResizeStart(element.id, handle);
    } else {
      // При начале перемещения передаем глобальный Y
      const globalOffsetY = isPaginated ? offsetY + currentPage * PAGE_HEIGHT : offsetY;
      onElementMoveStart(element.id, offsetX, globalOffsetY);
    }
  };

  const currentHeight = isPaginated ? PAGE_HEIGHT : canvasHeightHTML;

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: 100,
        transform: `scale(${zoom})`,
        transformOrigin: "top center",
        width: canvasWidth, 
      }}
    >
      <div style={{ position: "relative", width: canvasWidth, height: currentHeight }}>
        {/* ФОН */}
        <div
          style={{
            width: canvasWidth,
            height: currentHeight,
            backgroundColor: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            position: "absolute",
            top: 0,
            left: 0,
            backgroundImage: gridVisible
              ? `linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)`
              : undefined,
            backgroundSize: gridVisible
              ? `${gridStep}px ${gridStep}px`
              : undefined,
          }}
        />

        {/* СЛОЙ 2: ЭЛЕМЕНТЫ */}
        <div
          className="canvas-layer"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: canvasWidth,
            height: currentHeight,
            zIndex: 10,
          }}
          onClick={() => onSelect(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/")) onImageUpload(file);
          }}
        >
          {visibleElements.map((el) => {
            // Если документ пагинированный, вычитаем высоту предыдущих страниц
            const visualY = isPaginated ? el.y - currentPage * PAGE_HEIGHT : el.y;
            const visualEl = { ...el, y: visualY };

            return (
              <React.Fragment key={el.id}>
                <ElementRenderer
                  element={visualEl} 
                  isSelected={el.id === selectedId}
                  onSelect={() => onSelect(el.id)}
                  onMouseDown={(e, _id, handle) => handleElementMouseDown(e, el, handle)} 
                  onEditSignature={onEditSignature}
                  onUpdateProp={onUpdateProp}
                />
                {el.id === selectedId && (
                  <ResizeHandles
                    element={visualEl} 
                    zoom={zoom}
                    onMouseDown={(e, _, handle) => handleElementMouseDown(e, el, handle)}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
});

Canvas.displayName = "Canvas";

export default Canvas;
