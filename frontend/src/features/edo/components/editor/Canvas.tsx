// src/components/editor/Canvas.tsx

import React, { forwardRef, useEffect, useMemo, useRef } from "react";
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
const PAGE_GAP = 20;

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
  const isPaginated = templateType !== "HTML";
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);

  // 1. Ширина полотна (растягивается под элементы)
  const canvasWidth = useMemo(() => {
    if (isPaginated) return PAGE_WIDTH;
    if (elements.length === 0) return PAGE_WIDTH;
    const maxX = Math.max(...elements.map((el) => {
      let w = el.width;
      if (el.type === "table") {
         const props = el.properties as any;
         if (props.columns?.length) {
           const columnsWidth = props.columns.reduce((acc: number, col: any) => {
             const colWidth = Number(col?.width) || 0;
             return acc + Math.max(0, colWidth);
           }, 0);
           w = Math.max(w, columnsWidth);
         } else {
           const cols = props.cols || 1;
           w = Math.max(w, cols * 80);
         }
      }
      return el.x + w;
    }));
    return Math.max(PAGE_WIDTH, maxX + 40);
  }, [elements, isPaginated]);

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

  const totalPages = useMemo(() => {
    if (!isPaginated) return 1;
    if (elements.length === 0) return 1;
    const maxBottom = Math.max(
      ...elements.map((el) => (Number(el.y) || 0) + Math.max(1, Number(el.height) || 0)),
    );
    return Math.max(1, Math.ceil(maxBottom / PAGE_HEIGHT));
  }, [elements, isPaginated]);

  useEffect(() => {
    if (!isPaginated) return;
    const target = pageRefs.current[currentPage];
    if (!target) return;
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentPage, isPaginated]);

  // Хэндлеры
  const handleElementMouseDown = (
    e: React.MouseEvent,
    element: IEditorElement,
    pageIndex: number,
    handle?: string
  ) => {
    e.stopPropagation();
    
    const canvasEl = (e.currentTarget as HTMLElement).closest(".canvas-layer") as HTMLElement | null;
    if (!canvasEl) return;
    
    const canvasRect = canvasEl.getBoundingClientRect();
    const pageTop = isPaginated ? pageIndex * PAGE_HEIGHT : 0;
    const visualY = isPaginated ? element.y - pageTop : element.y;
    
    const offsetX = (e.clientX - canvasRect.left) / zoom - element.x;
    const offsetY = (e.clientY - canvasRect.top) / zoom - visualY;

    if (handle) {
      onElementResizeStart(element.id, handle);
    } else {
      onElementMoveStart(element.id, offsetX, offsetY);
    }
  };

  const currentHeight = isPaginated ? PAGE_HEIGHT : canvasHeightHTML;

  const renderPage = (pageIndex: number) => {
    const pageTop = pageIndex * PAGE_HEIGHT;
    const pageWidth = isPaginated ? PAGE_WIDTH : canvasWidth;
    const pageHeight = isPaginated ? PAGE_HEIGHT : currentHeight;
    const pageElements = isPaginated
      ? elements.filter((el) => {
          const elTop = Number(el.y) || 0;
          const elBottom = elTop + Math.max(1, Number(el.height) || 0);
          const pageTop = pageIndex * PAGE_HEIGHT;
          const pageBottom = pageTop + PAGE_HEIGHT;
          return elTop < pageBottom && elBottom > pageTop;
        })
      : elements;

    return (
      <div
        key={pageIndex}
        ref={(node) => {
          pageRefs.current[pageIndex] = node;
        }}
        className="canvas-page"
        data-page-index={pageIndex}
        style={{
          position: "relative",
          width: pageWidth,
          height: pageHeight,
          borderRadius: 8,
          boxShadow:
            isPaginated && pageIndex === currentPage
              ? "0 0 0 2px rgba(59,130,246,0.45)"
              : "none",
        }}
      >
        <div
          style={{
            width: pageWidth,
            height: pageHeight,
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

        <div
          className="canvas-layer"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: pageWidth,
            height: pageHeight,
            zIndex: 10,
            overflow: "hidden",
          }}
          onClick={() => onSelect(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/")) onImageUpload(file);
          }}
        >
          {pageElements.map((el) => {
            const visualY = isPaginated ? el.y - pageTop : el.y;
            const visualEl = { ...el, y: visualY };
            const ownerPage = Math.floor(
              Math.max(0, Number(el.y) || 0) / PAGE_HEIGHT,
            );
            const isOwnerPage = !isPaginated || ownerPage === pageIndex;
            const isSelectedOnPage = isOwnerPage && el.id === selectedId;
            return (
              <React.Fragment key={`${el.id}_${pageIndex}`}>
                <div style={{ pointerEvents: isOwnerPage ? "auto" : "none" }}>
                  <ElementRenderer
                    element={visualEl}
                    isSelected={isSelectedOnPage}
                    onSelect={() => {
                      if (isOwnerPage) onSelect(el.id);
                    }}
                    onMouseDown={(e, _id, handle) => {
                      if (!isOwnerPage) return;
                      handleElementMouseDown(e, el, pageIndex, handle);
                    }}
                    onEditSignature={onEditSignature}
                    onUpdateProp={onUpdateProp}
                  />
                </div>
                {isSelectedOnPage && (
                  <ResizeHandles
                    element={visualEl}
                    zoom={zoom}
                    onMouseDown={(e, _, handle) =>
                      handleElementMouseDown(e, el, pageIndex, handle)
                    }
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isPaginated ? PAGE_GAP : 0,
        paddingBottom: 100,
        transform: `scale(${zoom})`,
        transformOrigin: "top center",
        width: isPaginated ? PAGE_WIDTH : canvasWidth,
      }}
    >
      {isPaginated
        ? Array.from({ length: totalPages }, (_, idx) => renderPage(idx))
        : renderPage(0)}
    </div>
  );
});

Canvas.displayName = "Canvas";

export default Canvas;
