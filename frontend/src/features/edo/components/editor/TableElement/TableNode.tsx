import React, { useState, useRef } from "react";
import { TableContextMenu } from "./TableContextMenu";
import { generateId } from "../../../utils/help/generateID";

interface TableNodeProps {
  element: any; 
  isSelected: boolean;
  onUpdateProp: (id: string, props: any) => void;
}

export const TableNode: React.FC<TableNodeProps> = ({
  element,
  isSelected,
  onUpdateProp,
}) => {
  const props = element.properties;
  const isNewStructure = !!(props.cells && props.columns);
  
  const [resizingCol, setResizingCol] = useState<number | null>(null);

  const handleAddRow = () => {
    if (!isNewStructure) return;
    const newCells = [...props.cells];
    const numCols = props.columns.length;
    const newRow = Array.from({ length: numCols }).map(() => ({
      id: generateId(),
      content: "",
      rowSpan: 1,
      colSpan: 1,
    }));
    newCells.push(newRow);
    onUpdateProp(element.id, { cells: newCells });
  };

  const handleAddCol = () => {
    if (!isNewStructure) return;
    const newColumns = [...props.columns, { width: 100 }];
    const newCells = props.cells.map((row: any[]) => [
      ...row,
      { id: generateId(), content: "", rowSpan: 1, colSpan: 1 },
    ]);
    onUpdateProp(element.id, { 
      columns: newColumns,
      cells: newCells 
    });
  };

  const handleDeleteRow = () => {
    if (!isNewStructure || props.cells.length <= 1) return;
    const newCells = [...props.cells];
    newCells.pop();
    onUpdateProp(element.id, { cells: newCells });
  };

  const handleDeleteCol = () => {
    if (!isNewStructure || props.columns.length <= 1) return;
    const newColumns = [...props.columns];
    newColumns.pop();
    const newCells = props.cells.map((row: any[]) => {
      const newRow = [...row];
      newRow.pop();
      return newRow;
    });
    onUpdateProp(element.id, { 
      columns: newColumns,
      cells: newCells 
    });
  };

  const handleMerge = () => {
    alert("Для объединения зажмите Shift и выделите ячейки (в разработке)");
  };

  const handleResizeStart = (e: React.MouseEvent, idx: number) => {
    if (!isNewStructure) return;
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(idx);

    const startX = e.clientX;
    const startWidth = props.columns[idx].width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + delta);
      
      const newColumns = [...props.columns];
      newColumns[idx] = { ...newColumns[idx], width: newWidth };
      onUpdateProp(element.id, { columns: newColumns });
    };

    const onMouseUp = () => {
      setResizingCol(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  if (!isNewStructure) {
    // Рендер старой структуры для обратной совместимости
    return (
      <table style={{ width: "100%", height: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {Array.from({ length: props.rows || 0 }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: props.cols || 0 }).map((__, j) => (
                <td
                  key={`${i}-${j}`}
                  style={{
                    border: `${props.borderWidth || 1}px solid ${props.borderColor || "#000"}`,
                    padding: "8px",
                    background: props.cellBg,
                    color: props.cellTextColors?.[i]?.[j] || "#000000",
                  }}
                >
                  {props.data?.[i]?.[j] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <TableContextMenu
      onAddRow={handleAddRow}
      onAddCol={handleAddCol}
      onDeleteRow={handleDeleteRow}
      onDeleteCol={handleDeleteCol}
      onMerge={handleMerge}
      onSplit={() => {}}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <table 
          style={{ 
            width: "100%", 
            height: "100%", 
            borderCollapse: "collapse", 
            tableLayout: "fixed",
            border: `${props.borderWidth}px solid ${props.borderColor}`
          }}
        >
          <colgroup>
            {props.columns.map((col: any, idx: number) => (
              <col key={idx} style={{ width: col.width }} />
            ))}
          </colgroup>
          <tbody>
            {props.cells.map((row: any[], rIdx: number) => (
              <tr key={rIdx}>
                {row.map((cell: any, cIdx: number) => {
                  if (!cell) return null;
                  return (
                    <td
                      key={`${rIdx}-${cIdx}`}
                      rowSpan={cell.rowSpan}
                      colSpan={cell.colSpan}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newCells = [...props.cells];
                        newCells[rIdx][cIdx] = { ...cell, content: e.currentTarget.textContent || "" };
                        onUpdateProp(element.id, { cells: newCells });
                      }}
                      style={{
                        border: `${cell.style?.borderWidth ?? props.borderWidth}px solid ${cell.style?.borderColor ?? props.borderColor}`,
                        padding: "8px",
                        background: cell.style?.backgroundColor ?? props.cellBg,
                        color: cell.style?.color || "#000000",
                        fontSize: cell.style?.fontSize ? `${cell.style.fontSize}px` : undefined,
                        fontWeight: cell.style?.fontWeight || "normal",
                        textAlign: cell.style?.textAlign || "left",
                        outline: "none",
                        position: "relative",
                        wordBreak: "break-word",
                        verticalAlign: "top"
                      }}
                    >
                      {cell.content}
                      {isSelected && rIdx === 0 && (
                        <div
                          onMouseDown={(e) => handleResizeStart(e, cIdx)}
                          style={{
                            position: "absolute",
                            right: -3,
                            top: 0,
                            bottom: 0,
                            width: 6,
                            cursor: "col-resize",
                            zIndex: 20,
                            backgroundColor: resizingCol === cIdx ? "var(--c-accent)" : "transparent"
                          }}
                          className="hover:bg-blue-400/30"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableContextMenu>
  );
};
