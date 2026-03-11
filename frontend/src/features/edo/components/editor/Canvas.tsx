// src/components/editor/Canvas.tsx

import React, { forwardRef, useMemo } from "react";
import type { IEditorElement } from "../../utils/types/editor.types";
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
}

const PAGE_HEIGHT = 1123; // A4 px height
const PAGE_WIDTH = 794; // A4 px width
const PAGE_GAP = 20; // Отступ между страницами (визуальный)

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(function CanvasComponent(
  {
    elements,
    selectedId,
    gridVisible,
    zoom,
    gridStep = 20,
    onSelect,
    onElementMoveStart,
    onElementResizeStart,
    onUpdateProp,
    onImageUpload,
    onEditSignature,
  },
  ref
) {
  // 1. Вычисляем количество страниц на основе самого нижнего элемента
  const pagesCount = useMemo(() => {
    if (elements.length === 0) return 1;
    const maxY = Math.max(...elements.map((el) => el.y + el.height));
    // Всегда минимум 1 страница
    return Math.max(1, Math.ceil(maxY / PAGE_HEIGHT));
  }, [elements]);

  // Хэндлеры (без изменений)
  const handleElementMouseDown = (
    e: React.MouseEvent,
    element: IEditorElement,
    handle?: string
  ) => {
    const canvasEl = (e.currentTarget as HTMLElement).closest(
      ".canvas-layer"
    ) as HTMLElement | null;
    const canvasRect = canvasEl?.getBoundingClientRect();
    const offsetX = canvasRect
      ? (e.clientX - canvasRect.left) / zoom - element.x
      : 0;
    const offsetY = canvasRect
      ? (e.clientY - canvasRect.top) / zoom - element.y
      : 0;

    if (handle) {
      e.stopPropagation();
      onElementResizeStart(element.id, handle);
    } else {
      onElementMoveStart(element.id, offsetX, offsetY);
    }
  };

  return (
    <div
      ref={ref}
      style={{
        // Контейнер скролла
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: 100,
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        width: PAGE_WIDTH, // Фиксируем ширину для зума
      }}
    >
      {/* 
          СЛОЙ 1: ВИЗУАЛЬНЫЕ СТРАНИЦЫ (ФОН) 
          Отрисовываем N страниц с отступами
      */}
      {Array.from({ length: pagesCount }).map((_, idx) => (
        <div
          key={idx}
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            backgroundColor: "#fff",
            marginBottom: PAGE_GAP, // Отступ между листами
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)", // Тень страницы
            position: "relative",
            // Сетка рисуется на каждой странице
            backgroundImage: gridVisible
              ? `linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)`
              : undefined,
            backgroundSize: gridVisible
              ? `${gridStep}px ${gridStep}px`
              : undefined,
          }}
        />
      ))}

      {/* 
          СЛОЙ 2: ЭЛЕМЕНТЫ (АБСОЛЮТНЫЙ ОВЕРЛЕЙ)
          Один большой прозрачный слой поверх всех страниц.
          Это позволяет перетаскивать элементы между страницами без проблем.
      */}
      <div
        className="canvas-layer"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: PAGE_WIDTH,
          // Высота равна (кол-во страниц * высота страницы) + (отступы)
          height: pagesCount * PAGE_HEIGHT + (pagesCount - 1) * PAGE_GAP,
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
        {elements.map((el) => {
          // Корректировка Y для визуального отображения с отступами между страницами
          // Если элемент на 2й странице (Y > 1123), мы должны добавить PAGE_GAP к его CSS top
          const pageIndex = Math.floor(el.y / PAGE_HEIGHT);
          const visualY = el.y + pageIndex * PAGE_GAP;

          // Создаем копию элемента с скорректированным Y только для рендера
          // Реальные координаты (el.y) остаются непрерывными для логики
          const visualEl = { ...el, y: visualY };

          return (
            <React.Fragment key={el.id}>
              <ElementRenderer
                element={visualEl} // Используем скорректированный Y
                isSelected={el.id === selectedId}
                onSelect={() => onSelect(el.id)}
                onMouseDown={(e, _id, handle) =>
                  handleElementMouseDown(e, el, handle)
                } // Передаем оригинальный el
                onEditSignature={onEditSignature}
                onUpdateProp={onUpdateProp}
              />
              {el.id === selectedId && (
                <ResizeHandles
                  element={visualEl} // Используем скорректированный Y
                  zoom={zoom}
                  onMouseDown={(e, _, handle) =>
                    handleElementMouseDown(e, el, handle)
                  }
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

Canvas.displayName = "Canvas";

export default Canvas;
