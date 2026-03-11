// src/components/editor/ResizeHandles.tsx
import type { IEditorElement } from "../../utils/types/editor.types";

interface ResizeHandlesProps {
  element: IEditorElement;
  zoom: number;
  onMouseDown: (
    e: React.MouseEvent,
    element: IEditorElement,
    handle: string,
  ) => void;
}

const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  element,
  zoom,
  onMouseDown,
}) => {
  const cornerSize = 10;
  const edgeSize = 8;

  // Стиль для угловых ручек
  const cornerStyle = (
    cursor: string,
    position: React.CSSProperties,
  ): React.CSSProperties => ({
    position: "absolute",
    width: cornerSize,
    height: cornerSize,
    background: "var(--c-accent, #3b82f6)",
    border: "2px solid white",
    borderRadius: "50%",
    cursor,
    transform: `scale(${1 / zoom})`,
    transformOrigin: "center",
    pointerEvents: "auto",
    zIndex: 1001,
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    ...position,
  });

  // Стиль для боковых ручек (прямоугольные)
  const edgeStyle = (
    cursor: string,
    position: React.CSSProperties,
    isHorizontal: boolean,
  ): React.CSSProperties => ({
    position: "absolute",
    width: isHorizontal ? edgeSize * 2 : edgeSize,
    height: isHorizontal ? edgeSize : edgeSize * 2,
    background: "var(--c-accent, #3b82f6)",
    border: "2px solid white",
    borderRadius: 3,
    cursor,
    transform: `scale(${1 / zoom})`,
    transformOrigin: "center",
    pointerEvents: "auto",
    zIndex: 1001,
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    ...position,
  });

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    pointerEvents: "none",
  };

  return (
    <div style={containerStyle}>
      {/* Угловые ручки */}
      {/* top-left (nw) */}
      <div
        style={cornerStyle("nw-resize", {
          left: -cornerSize / 2,
          top: -cornerSize / 2,
        })}
        onMouseDown={(e) => onMouseDown(e, element, "nw")}
      />
      {/* top-right (ne) */}
      <div
        style={cornerStyle("ne-resize", {
          right: -cornerSize / 2,
          top: -cornerSize / 2,
        })}
        onMouseDown={(e) => onMouseDown(e, element, "ne")}
      />
      {/* bottom-left (sw) */}
      <div
        style={cornerStyle("sw-resize", {
          left: -cornerSize / 2,
          bottom: -cornerSize / 2,
        })}
        onMouseDown={(e) => onMouseDown(e, element, "sw")}
      />
      {/* bottom-right (se) */}
      <div
        style={cornerStyle("se-resize", {
          right: -cornerSize / 2,
          bottom: -cornerSize / 2,
        })}
        onMouseDown={(e) => onMouseDown(e, element, "se")}
      />

      {/* Боковые ручки (для resize по одной оси) */}
      {/* top (n) */}
      <div
        style={edgeStyle(
          "n-resize",
          {
            left: "50%",
            top: -edgeSize / 2,
            marginLeft: -edgeSize,
          },
          true,
        )}
        onMouseDown={(e) => onMouseDown(e, element, "n")}
      />
      {/* bottom (s) */}
      <div
        style={edgeStyle(
          "s-resize",
          {
            left: "50%",
            bottom: -edgeSize / 2,
            marginLeft: -edgeSize,
          },
          true,
        )}
        onMouseDown={(e) => onMouseDown(e, element, "s")}
      />
      {/* left (w) */}
      <div
        style={edgeStyle(
          "w-resize",
          {
            left: -edgeSize / 2,
            top: "50%",
            marginTop: -edgeSize,
          },
          false,
        )}
        onMouseDown={(e) => onMouseDown(e, element, "w")}
      />
      {/* right (e) */}
      <div
        style={edgeStyle(
          "e-resize",
          {
            right: -edgeSize / 2,
            top: "50%",
            marginTop: -edgeSize,
          },
          false,
        )}
        onMouseDown={(e) => onMouseDown(e, element, "e")}
      />
    </div>
  );
};

export default ResizeHandles;
