import React from "react";
import { Move } from "lucide-react";

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({ onMouseDown }) => {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        top: -20,
        left: -20,
        width: 28,
        height: 28,
        backgroundColor: "white",
        color: "var(--c-accent, #3b82f6)",
        border: "1px solid var(--c-accent, #3b82f6)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "move",
        zIndex: 50,
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
      }}
      className="hover:bg-blue-50 transition-colors"
      title="Зажмите для перемещения таблицы"
    >
      <Move size={14} />
    </div>
  );
};
