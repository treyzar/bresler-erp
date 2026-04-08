// src/features/edo/utils/migration/__tests__/tableConverter.test.ts
/**
 * Tests for Canvas Table → Tiptap Table conversion
 * Ensures proper handling of rowspan, colspan, and cell styling
 */

import { describe, it, expect } from 'vitest';
import type { IEditorElement, ITableProperties, ITableCell } from '../../types/editor.types';
import {
  convertCanvasTableToTiptapTable,
  convertTiptapToCanvasTable,
  validateCanvasTable,
} from '../tableConverter';

describe('convertCanvasTableToTiptapTable', () => {
  const createTableElement = (
    cells: (ITableCell | null)[][],
    columns: { width: number }[]
  ): IEditorElement => ({
    id: 'table-1',
    type: 'table',
    x: 50,
    y: 100,
    width: columns.reduce((sum, col) => sum + col.width, 0),
    height: cells.length * 40,
    zIndex: 0,
    properties: {
      cells,
      columns,
      borderWidth: 1,
      borderColor: '#000000',
      cellBg: '#FFFFFF',
    } as ITableProperties,
  });

  describe('Basic Table Conversion', () => {
    it('should convert 2x2 table without merges', () => {
      const element = createTableElement(
        [
          [
            { id: 'c1', content: 'A1', rowSpan: 1, colSpan: 1 },
            { id: 'c2', content: 'B1', rowSpan: 1, colSpan: 1 },
          ],
          [
            { id: 'c3', content: 'A2', rowSpan: 1, colSpan: 1 },
            { id: 'c4', content: 'B2', rowSpan: 1, colSpan: 1 },
          ],
        ],
        [{ width: 200 }, { width: 200 }]
      );

      const result = convertCanvasTableToTiptapTable(element);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('table');
      expect(result?.content).toHaveLength(2); // 2 rows
      
      // Check first row
      expect(result?.content[0].content).toHaveLength(2);
      expect(result?.content[0].content[0].content?.[0]?.content?.[0]?.text).toBe('A1');
    });

    it('should preserve table width in attrs', () => {
      const element = createTableElement(
        [[{ id: 'c1', content: 'Test', rowSpan: 1, colSpan: 1 }]],
        [{ width: 400 }]
      );

      const result = convertCanvasTableToTiptapTable(element);
      expect(result?.attrs?.width).toBe(400);
    });

    it('should preserve border properties', () => {
      const element = createTableElement(
        [[{ id: 'c1', content: 'Test', rowSpan: 1, colSpan: 1 }]],
        [{ width: 400 }]
      );
      element.properties.borderWidth = 2;
      element.properties.borderColor = '#FF0000';

      const result = convertCanvasTableToTiptapTable(element);
      expect(result?.attrs?.borderWidth).toBe(2);
      expect(result?.attrs?.borderColor).toBe('#FF0000');
    });
  });

  describe('Rowspan Handling', () => {
    it('should convert cell with rowspan=2', () => {
      const element = createTableElement(
        [
          [
            { id: 'c1', content: 'Merged', rowSpan: 2, colSpan: 1 },
            { id: 'c2', content: 'B1', rowSpan: 1, colSpan: 1 },
          ],
          [
            null, // Merged cell placeholder
            { id: 'c4', content: 'B2', rowSpan: 1, colSpan: 1 },
          ],
        ],
        [{ width: 200 }, { width: 200 }]
      );

      const result = convertCanvasTableToTiptapTable(element);

      expect(result).not.toBeNull();
      
      // First cell should have rowspan
      const firstCell = result?.content[0].content[0];
      expect(firstCell.attrs?.rowspan).toBe(2);
      
      // Second row should only have 1 cell (first is merged)
      expect(result?.content[1].content).toHaveLength(1);
    });

    it('should handle multiple rowspans in same table', () => {
      const element = createTableElement(
        [
          [
            { id: 'c1', content: 'M1', rowSpan: 2, colSpan: 1 },
            { id: 'c2', content: 'M2', rowSpan: 2, colSpan: 1 },
          ],
          [
            null,
            null,
          ],
        ],
        [{ width: 200 }, { width: 200 }]
      );

      const result = convertCanvasTableToTiptapTable(element);

      expect(result?.content[0].content).toHaveLength(2);
      expect(result?.content[0].content[0].attrs?.rowspan).toBe(2);
      expect(result?.content[0].content[1].attrs?.rowspan).toBe(2);
    });
  });

  describe('Colspan Handling', () => {
    it('should convert cell with colspan=2', () => {
      const element = createTableElement(
        [
          [
            { id: 'c1', content: 'Wide', rowSpan: 1, colSpan: 2 },
          ],
          [
            { id: 'c2', content: 'A2', rowSpan: 1, colSpan: 1 },
            { id: 'c3', content: 'B2', rowSpan: 1, colSpan: 1 },
          ],
        ],
        [{ width: 200 }, { width: 200 }]
      );

      const result = convertCanvasTableToTiptapTable(element);

      expect(result).not.toBeNull();
      
      // First cell should have colspan
      const firstCell = result?.content[0].content[0];
      expect(firstCell.attrs?.colspan).toBe(2);
    });

    it('should handle combined rowspan and colspan', () => {
      const element = createTableElement(
        [
          [
            { id: 'c1', content: 'Big', rowSpan: 2, colSpan: 2 },
            { id: 'c2', content: 'C1', rowSpan: 1, colSpan: 1 },
          ],
          [
            null,
            null,
            { id: 'c5', content: 'C2', rowSpan: 1, colSpan: 1 },
          ],
        ],
        [{ width: 200 }, { width: 200 }, { width: 200 }]
      );

      const result = convertCanvasTableToTiptapTable(element);

      expect(result).not.toBeNull();
      
      const bigCell = result?.content[0].content[0];
      expect(bigCell.attrs?.rowspan).toBe(2);
      expect(bigCell.attrs?.colspan).toBe(2);
    });
  });

  describe('Cell Styling', () => {
    it('should preserve cell background color', () => {
      const element = createTableElement(
        [[{ 
          id: 'c1', 
          content: 'Test', 
          rowSpan: 1, 
          colSpan: 1,
          style: {
            backgroundColor: '#FFEE00',
            borderWidth: 1,
            borderColor: '#000000',
            textAlign: 'center',
          }
        }]],
        [{ width: 200 }]
      );

      const result = convertCanvasTableToTiptapTable(element);
      
      const cell = result?.content[0].content[0];
      expect(cell.attrs?.backgroundColor).toBe('#FFEE00');
    });

    it('should preserve text alignment', () => {
      const element = createTableElement(
        [[{ 
          id: 'c1', 
          content: 'Test', 
          rowSpan: 1, 
          colSpan: 1,
          style: {
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#000000',
            textAlign: 'right',
          }
        }]],
        [{ width: 200 }]
      );

      const result = convertCanvasTableToTiptapTable(element);
      
      const cell = result?.content[0].content[0];
      expect(cell.attrs?.textAlign).toBe('right');
    });

    it('should preserve cell border properties', () => {
      const element = createTableElement(
        [[{ 
          id: 'c1', 
          content: 'Test', 
          rowSpan: 1, 
          colSpan: 1,
          style: {
            backgroundColor: '#FFFFFF',
            borderWidth: 3,
            borderColor: '#FF0000',
            textAlign: 'left',
          }
        }]],
        [{ width: 200 }]
      );

      const result = convertCanvasTableToTiptapTable(element);
      
      const cell = result?.content[0].content[0];
      expect(cell.attrs?.borderWidth).toBe(3);
      expect(cell.attrs?.borderColor).toBe('#FF0000');
    });
  });

  describe('Legacy Data Format', () => {
    it('should convert old format (data array)', () => {
      const element: IEditorElement = {
        id: 'table-1',
        type: 'table',
        x: 50,
        y: 100,
        width: 400,
        height: 100,
        zIndex: 0,
        properties: {
          rows: 2,
          cols: 2,
          borderWidth: 1,
          borderColor: '#000000',
          cellBg: '#FFFFFF',
          data: [
            ['A1', 'B1'],
            ['A2', 'B2'],
          ],
        } as ITableProperties,
      };

      const result = convertCanvasTableToTiptapTable(element);

      expect(result).not.toBeNull();
      expect(result?.content).toHaveLength(2);
      expect(result?.content[0].content[0].content?.[0]?.content?.[0]?.text).toBe('A1');
    });
  });
});

describe('convertTiptapToCanvasTable', () => {
  it('should convert Tiptap table back to Canvas format', () => {
    const tiptapTable = {
      type: 'table' as const,
      content: [
        {
          type: 'tableRow' as const,
          content: [
            {
              type: 'tableCell' as const,
              content: [{
                type: 'paragraph' as const,
                content: [{ type: 'text' as const, text: 'A1' }],
              }],
              attrs: {
                rowspan: 1,
                colspan: 1,
                backgroundColor: '#FFFFFF',
                textAlign: 'left',
                borderWidth: 1,
                borderColor: '#000000',
              },
            },
          ],
        },
      ],
      attrs: {
        width: 400,
        borderWidth: 1,
        borderColor: '#000000',
      },
    };

    const result = convertTiptapToCanvasTable(tiptapTable, 'table-1');

    expect(result).not.toBeNull();
    expect(result?.type).toBe('table');
    expect(result?.properties.cells).toHaveLength(1);
    expect(result?.properties.cells?.[0]?.[0]?.content).toBe('A1');
  });
});

describe('validateCanvasTable', () => {
  it('should validate correct table structure', () => {
    const element: IEditorElement = {
      id: 'table-1',
      type: 'table',
      x: 50,
      y: 100,
      width: 400,
      height: 100,
      zIndex: 0,
      properties: {
        cells: [[{ id: 'c1', content: 'Test', rowSpan: 1, colSpan: 1 }]],
        columns: [{ width: 400 }],
        borderWidth: 1,
        borderColor: '#000000',
        cellBg: '#FFFFFF',
      } as ITableProperties,
    };

    const result = validateCanvasTable(element);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject table with no data', () => {
    const element: IEditorElement = {
      id: 'table-1',
      type: 'table',
      x: 50,
      y: 100,
      width: 400,
      height: 100,
      zIndex: 0,
      properties: {
        borderWidth: 1,
        borderColor: '#000000',
        cellBg: '#FFFFFF',
      } as ITableProperties,
    };

    const result = validateCanvasTable(element);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no cell data'))).toBe(true);
  });

  it('should warn about column count mismatch', () => {
    const element: IEditorElement = {
      id: 'table-1',
      type: 'table',
      x: 50,
      y: 100,
      width: 400,
      height: 100,
      zIndex: 0,
      properties: {
        cells: [
          [{ id: 'c1', content: 'A1', rowSpan: 1, colSpan: 1 }],
          [
            { id: 'c2', content: 'A2', rowSpan: 1, colSpan: 1 },
            { id: 'c3', content: 'B2', rowSpan: 1, colSpan: 1 },
          ],
        ],
        columns: [{ width: 200 }], // Only 1 column defined
        borderWidth: 1,
        borderColor: '#000000',
        cellBg: '#FFFFFF',
      } as ITableProperties,
    };

    const result = validateCanvasTable(element);
    expect(result.warnings.some(w => w.includes('Row 1 has'))).toBe(true);
  });
});
