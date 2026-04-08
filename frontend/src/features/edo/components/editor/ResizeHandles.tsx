import type { IEditorElement } from "../../utils/types/editor.types";

interface ResizeHandlesProps {
  element: IEditorElement;
  zoom: number;
  onMouseDown: (e: React.MouseEvent, element: IEditorElement, handle: string) => void;
}

const ResizeHandles: React.FC<ResizeHandlesProps> = ({ element, zoom, onMouseDown }) => {
  const handleSize = 8;
  const scale = 1 / zoom;

  const handleStyle = (cursor: string, position: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: handleSize,
    height: handleSize,
    background: "#3b82f6",
    border: "1.5px solid #ffffff",
    borderRadius: "50%",
    cursor,
    transform: `scale(${scale})`,
    transformOrigin: "center",
    pointerEvents: "auto",
    zIndex: 1001,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
    transition: "background 0.15s ease, box-shadow 0.15s ease",
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
      <div style={handleStyle("nw-resize", { left: -handleSize / 2, top: -handleSize / 2 })} onMouseDown={(e) => onMouseDown(e, element, "nw")} />
      <div style={handleStyle("ne-resize", { right: -handleSize / 2, top: -handleSize / 2 })} onMouseDown={(e) => onMouseDown(e, element, "ne")} />
      <div style={handleStyle("sw-resize", { left: -handleSize / 2, bottom: -handleSize / 2 })} onMouseDown={(e) => onMouseDown(e, element, "sw")} />
      <div style={handleStyle("se-resize", { right: -handleSize / 2, bottom: -handleSize / 2 })} onMouseDown={(e) => onMouseDown(e, element, "se")} />
      <div style={handleStyle("n-resize", { left: "50%", top: -handleSize / 2, marginLeft: -handleSize / 2 })} onMouseDown={(e) => onMouseDown(e, element, "n")} />
      <div style={handleStyle("s-resize", { left: "50%", bottom: -handleSize / 2, marginLeft: -handleSize / 2 })} onMouseDown={(e) => onMouseDown(e, element, "s")} />
      <div style={handleStyle("w-resize", { left: -handleSize / 2, top: "50%", marginTop: -handleSize / 2 })} onMouseDown={(e) => onMouseDown(e, element, "w")} />
      <div style={handleStyle("e-resize", { right: -handleSize / 2, top: "50%", marginTop: -handleSize / 2 })} onMouseDown={(e) => onMouseDown(e, element, "e")} />
    </div>
  );
};

export default ResizeHandles;
