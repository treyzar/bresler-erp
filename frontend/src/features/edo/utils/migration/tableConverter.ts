// src/features/edo/utils/migration/tableConverter.ts
/**
 * Table conversion utilities for Canvas → Tiptap migration
 * 
 * Handles complex 2D cell arrays with rowspan/colspan preservation
 * and custom cell styling migration
 */

import type {
  IEditorElement,
  ITableProperties,
  ITableCell,
  ICellStyle,
} from '../types/editor.types';

import type {
  TiptapTable,
  TiptapTableRow,
  TiptapTableCell,
  TiptapParagraph,
} from '../types/tiptap.types';

/**
 * Converts Canvas ICellStyle to Tiptap cell attributes
 */
function convertCellStyleToTiptap(
  canvasStyle: ICellStyle | undefined,
  defaultProps: ITableProperties
): TiptapTableCell['attrs'] {
  const style = canvasStyle || ({} as ICellStyle);

  return {
    backgroundColor: style.backgroundColor || defaultProps.cellBg || undefined,
    textAlign: style.textAlign || 'left',
    borderWidth: style.borderWidth || defaultProps.borderWidth || 1,
    borderColor: style.borderColor || defaultProps.borderColor || '#000000',
  };
}

/**
 * Creates Tiptap paragraph content from cell text
 */
function createCellParagraph(content: string): TiptapParagraph {
  return {
    type: 'paragraph',
    content: content
      ? [
          {
            type: 'text',
            text: content,
          },
        ]
      : [],
  };
}

/**
 * Main conversion function: Canvas Table → Tiptap Table
 * 
 * Step-by-step reasoning:
 * 1. Iterate through each row of the 2D cells array
 * 2. For each cell, check if it's occupied by a rowspan from above
 * 3. If not occupied, convert the cell with proper colspan/rowspan
 * 4. Track occupied positions for subsequent rows
 * 5. Preserve custom styling (backgroundColor, textAlign, etc.)
 */
export function convertCanvasTableToTiptapTable(
  element: IEditorElement
): TiptapTable | null {
  const props = element.properties as ITableProperties;

  if (!props.cells || !props.columns) {
    // Fallback to old data format
    if (props.data && Array.isArray(props.data)) {
      return convertLegacyDataTable(element);
    }
    return null;
  }

  const rows: TiptapTableRow[] = [];
  const occupiedCells = new Map<string, { rowspan: number; colspan: number }>();

  // Process each row
  for (let rIdx = 0; rIdx < props.cells.length; rIdx++) {
    const row = props.cells[rIdx];
    if (!row) continue;

    const tiptapRow: TiptapTableRow = {
      type: 'tableRow',
      content: [],
    };

    let colIdx = 0;
    while (colIdx < (props.columns?.length || 0)) {
      // Check if this column is occupied by a colspan from the left
      let skipCol = false;
      for (let checkCol = 0; checkCol < colIdx; checkCol++) {
        const key = `${rIdx}-${checkCol}`;
        const occupied = occupiedCells.get(key);
        if (occupied && occupied.colspan > (colIdx - checkCol)) {
          skipCol = true;
          break;
        }
      }

      if (skipCol) {
        colIdx++;
        continue;
      }

      // Check for rowspan from above
      const occupiedFromAbove = occupiedCells.get(`${rIdx}-${colIdx}`);
      if (occupiedFromAbove) {
        colIdx++;
        continue;
      }

      const cell = row[colIdx];
      if (cell === null) {
        colIdx++;
        continue;
      }

      // Convert cell
      const tiptapCell: TiptapTableCell = {
        type: 'tableCell',
        content: [createCellParagraph(cell.content || '')],
        attrs: {
          ...convertCellStyleToTiptap(cell.style, props),
          colspan: cell.colSpan || 1,
          rowspan: cell.rowSpan || 1,
        },
      };

      tiptapRow.content.push(tiptapCell);

      // Mark occupied cells for rowspan/colspan
      const rowspan = cell.rowSpan || 1;
      const colspan = cell.colSpan || 1;

      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (dr === 0 && dc === 0) continue; // Skip the cell itself
          const occupiedKey = `${rIdx + dr}-${colIdx + dc}`;
          occupiedCells.set(occupiedKey, { rowspan, colspan });
        }
      }

      colIdx += colspan;
    }

    rows.push(tiptapRow);
  }

  return {
    type: 'table',
    content: rows,
    attrs: {
      width: element.width,
      borderWidth: props.borderWidth || 1,
      borderColor: props.borderColor || '#000000',
      backgroundColor: props.cellBg || undefined,
    },
  };
}

/**
 * Fallback converter for old format (data array without cells/columns)
 */
function convertLegacyDataTable(element: IEditorElement): TiptapTable | null {
  const props = element.properties as ITableProperties;

  if (!props.data || !Array.isArray(props.data)) {
    return null;
  }

  const rows: TiptapTableRow[] = props.data.map((rowData) => ({
    type: 'tableRow',
    content: rowData.map((cellText, cIdx) => {
      const cell: TiptapTableCell = {
        type: 'tableCell',
        content: [createCellParagraph(cellText || '')],
        attrs: {
          backgroundColor: props.cellBg || undefined,
          borderWidth: props.borderWidth || 1,
          borderColor: props.borderColor || '#000000',
          textAlign: 'left' as const,
        },
      };
      return cell;
    }),
  }));

  return {
    type: 'table',
    content: rows,
    attrs: {
      width: element.width,
      borderWidth: props.borderWidth || 1,
      borderColor: props.borderColor || '#000000',
    },
  };
}

/**
 * Reverse conversion: Tiptap Table → Canvas Table
 * Used for rollback or hybrid editing modes
 */
export function convertTiptapToCanvasTable(
  tiptapTable: TiptapTable,
  elementId: string
): IEditorElement | null {
  const cells: (ITableCell | null)[][] = [];
  const columns: { width: number }[] = [];

  // Calculate column widths from table width and cell count
  const tableWidth = tiptapTable.attrs?.width || 400;
  const maxCols = Math.max(
    ...tiptapTable.content.map((row) => row.content.length)
  );
  const columnWidth = tableWidth / maxCols;

  for (let i = 0; i < maxCols; i++) {
    columns.push({ width: columnWidth });
  }

  // Convert rows
  for (const tiptapRow of tiptapTable.content) {
    const canvasRow: (ITableCell | null)[] = [];

    for (const tiptapCell of tiptapRow.content) {
      const cellText =
        tiptapCell.content?.[0]?.content?.[0]?.text || '';

      const canvasCell: ITableCell = {
        id: `${elementId}-${cells.length}-${canvasRow.length}`,
        content: cellText,
        rowSpan: tiptapCell.attrs?.rowspan || 1,
        colSpan: tiptapCell.attrs?.colspan || 1,
        style: {
          backgroundColor: tiptapCell.attrs?.backgroundColor || 'transparent',
          borderColor: tiptapCell.attrs?.borderColor || '#000000',
          borderWidth: tiptapCell.attrs?.borderWidth || 1,
          textAlign: (tiptapCell.attrs?.textAlign || 'left') as 'left' | 'center' | 'right',
        },
      };

      canvasRow.push(canvasCell);
    }

    cells.push(canvasRow);
  }

  return {
    id: elementId,
    type: 'table',
    x: 0,
    y: 0,
    width: tableWidth,
    height: cells.length * 40, // Approximate
    zIndex: 0,
    properties: {
      cells,
      columns,
      borderWidth: tiptapTable.attrs?.borderWidth || 1,
      borderColor: tiptapTable.attrs?.borderColor || '#000000',
      cellBg: tiptapTable.attrs?.backgroundColor || 'transparent',
    } as ITableProperties,
  };
}

/**
 * Utility: Validate table structure before conversion
 */
export function validateCanvasTable(
  element: IEditorElement
): { valid: boolean; errors: string[]; warnings: string[] } {
  const props = element.properties as ITableProperties;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!props.cells && !props.data) {
    errors.push('Table has no cell data');
    return { valid: false, errors, warnings };
  }

  if (props.cells && props.columns) {
    // Validate 2D array structure
    const expectedCols = props.columns.length;

    for (let r = 0; r < props.cells.length; r++) {
      const row = props.cells[r];
      if (!row) {
        errors.push(`Row ${r} is missing`);
        continue;
      }

      if (row.length !== expectedCols) {
        warnings.push(
          `Row ${r} has ${row.length} cells, expected ${expectedCols}`
        );
      }

      // Check for null cells (merged cells are OK)
      const nonNullCells = row.filter((c) => c !== null);
      if (nonNullCells.length === 0) {
        warnings.push(`Row ${r} has no visible cells (all merged)`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
