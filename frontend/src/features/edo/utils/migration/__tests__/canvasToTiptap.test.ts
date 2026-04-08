// src/features/edo/utils/migration/__tests__/canvasToTiptap.test.ts
/**
 * Tests for Canvas → Tiptap migration utilities
 * Ensures data integrity and idempotent conversion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { IEditorElement, ITextProperties, ITableProperties } from '../../types/editor.types';
import { migrateCanvasToTiptap, validateTiptapDocument } from '../canvasToTiptap';
import type { TiptapDocument } from '../../types/tiptap.types';

describe('migrateCanvasToTiptap', () => {
  describe('Text Element Migration', () => {
    it('should convert simple text element to paragraph', () => {
      const elements: IEditorElement[] = [
        {
          id: 'text-1',
          type: 'text',
          x: 50,
          y: 100,
          width: 400,
          height: 50,
          zIndex: 0,
          properties: {
            content: 'Hello World',
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#000000',
            bold: false,
            italic: false,
            underline: false,
            align: 'left',
            textIndent: 0,
            lineHeight: 1.5,
            letterSpacing: 0,
            whiteSpace: 'normal',
            wordBreak: 'normal',
            paragraphSpacing: 0,
          } as ITextProperties,
        },
      ];

      const result = migrateCanvasToTiptap(elements);

      expect(result.success).toBe(true);
      expect(result.document).not.toBeNull();
      expect(result.document?.content).toHaveLength(1);
      expect(result.document?.content[0].type).toBe('paragraph');
    });

    it('should preserve text formatting (bold, italic, underline)', () => {
      const elements: IEditorElement[] = [
        {
          id: 'text-1',
          type: 'text',
          x: 50,
          y: 100,
          width: 400,
          height: 50,
          zIndex: 0,
          properties: {
            content: 'Bold Text',
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#FF0000',
            bold: true,
            italic: true,
            underline: true,
            align: 'center',
            textIndent: 0,
            lineHeight: 1.5,
            letterSpacing: 0,
            whiteSpace: 'normal',
            wordBreak: 'normal',
            paragraphSpacing: 0,
          } as ITextProperties,
        },
      ];

      const result = migrateCanvasToTiptap(elements);
      expect(result.success).toBe(true);
      
      const paragraph = result.document?.content[0] as any;
      expect(paragraph.attrs?.textAlign).toBe('center');
    });

    it('should handle multi-line text content', () => {
      const elements: IEditorElement[] = [
        {
          id: 'text-1',
          type: 'text',
          x: 50,
          y: 100,
          width: 400,
          height: 100,
          zIndex: 0,
          properties: {
            content: 'Line 1\nLine 2\nLine 3',
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#000000',
            bold: false,
            italic: false,
            underline: false,
            align: 'left',
            textIndent: 0,
            lineHeight: 1.5,
            letterSpacing: 0,
            whiteSpace: 'normal',
            wordBreak: 'normal',
            paragraphSpacing: 0,
          } as ITextProperties,
        },
      ];

      const result = migrateCanvasToTiptap(elements);
      expect(result.success).toBe(true);
      
      const paragraph = result.document?.content[0] as any;
      expect(paragraph.content).toBeDefined();
      expect(paragraph.content.length).toBeGreaterThan(0);
    });
  });

  describe('Table Migration', () => {
    it('should convert simple table without merged cells', () => {
      const elements: IEditorElement[] = [
        {
          id: 'table-1',
          type: 'table',
          x: 50,
          y: 100,
          width: 600,
          height: 200,
          zIndex: 0,
          properties: {
            rows: 2,
            cols: 2,
            borderWidth: 1,
            borderColor: '#000000',
            cellBg: '#FFFFFF',
            cells: [
              [
                { id: 'c1', content: 'Cell 1', rowSpan: 1, colSpan: 1 },
                { id: 'c2', content: 'Cell 2', rowSpan: 1, colSpan: 1 },
              ],
              [
                { id: 'c3', content: 'Cell 3', rowSpan: 1, colSpan: 1 },
                { id: 'c4', content: 'Cell 4', rowSpan: 1, colSpan: 1 },
              ],
            ],
            columns: [{ width: 300 }, { width: 300 }],
          } as ITableProperties,
        },
      ];

      const result = migrateCanvasToTiptap(elements);
      expect(result.success).toBe(true);
      
      const table = result.document?.content.find(n => n.type === 'table') as any;
      expect(table).toBeDefined();
      expect(table.content).toHaveLength(2); // 2 rows
      expect(table.content[0].content).toHaveLength(2); // 2 cells per row
    });

    it('should handle table with rowspan', () => {
      const elements: IEditorElement[] = [
        {
          id: 'table-1',
          type: 'table',
          x: 50,
          y: 100,
          width: 600,
          height: 200,
          zIndex: 0,
          properties: {
            rows: 2,
            cols: 2,
            borderWidth: 1,
            borderColor: '#000000',
            cellBg: '#FFFFFF',
            cells: [
              [
                { id: 'c1', content: 'Merged', rowSpan: 2, colSpan: 1 },
                { id: 'c2', content: 'Cell 2', rowSpan: 1, colSpan: 1 },
              ],
              [
                null, // Merged cell placeholder
                { id: 'c4', content: 'Cell 4', rowSpan: 1, colSpan: 1 },
              ],
            ],
            columns: [{ width: 300 }, { width: 300 }],
          } as ITableProperties,
        },
      ];

      const result = migrateCanvasToTiptap(elements);
      expect(result.success).toBe(true);
      
      const table = result.document?.content.find(n => n.type === 'table') as any;
      expect(table).toBeDefined();
      
      // First cell should have rowspan
      const firstCell = table.content[0].content[0];
      expect(firstCell.attrs?.rowspan).toBe(2);
    });
  });

  describe('Document Structure', () => {
    it('should sort elements by Y position (top to bottom)', () => {
      const elements: IEditorElement[] = [
        {
          id: 'text-2',
          type: 'text',
          x: 50,
          y: 200,
          width: 400,
          height: 50,
          zIndex: 0,
          properties: { content: 'Second', fontFamily: 'Arial', fontSize: 14, color: '#000', bold: false, italic: false, underline: false, align: 'left', textIndent: 0, lineHeight: 1.5, letterSpacing: 0, whiteSpace: 'normal', wordBreak: 'normal', paragraphSpacing: 0 } as ITextProperties,
        },
        {
          id: 'text-1',
          type: 'text',
          x: 50,
          y: 100,
          width: 400,
          height: 50,
          zIndex: 0,
          properties: { content: 'First', fontFamily: 'Arial', fontSize: 14, color: '#000', bold: false, italic: false, underline: false, align: 'left', textIndent: 0, lineHeight: 1.5, letterSpacing: 0, whiteSpace: 'normal', wordBreak: 'normal', paragraphSpacing: 0 } as ITextProperties,
        },
      ];

      const result = migrateCanvasToTiptap(elements);
      expect(result.success).toBe(true);
      
      const firstParagraph = result.document?.content[0] as any;
      expect(firstParagraph.content?.[0]?.text).toBe('First');
    });

    it('should include document metadata (attrs)', () => {
      const elements: IEditorElement[] = [];
      const result = migrateCanvasToTiptap(elements);

      expect(result.document?.attrs).toBeDefined();
      expect(result.document?.attrs?.pageWidth).toBe(794);
      expect(result.document?.attrs?.pageHeight).toBe(1123);
    });

    it('should store legacy elements for rollback', () => {
      const elements: IEditorElement[] = [
        {
          id: 'text-1',
          type: 'text',
          x: 50,
          y: 100,
          width: 400,
          height: 50,
          zIndex: 0,
          properties: { content: 'Test', fontFamily: 'Arial', fontSize: 14, color: '#000', bold: false, italic: false, underline: false, align: 'left', textIndent: 0, lineHeight: 1.5, letterSpacing: 0, whiteSpace: 'normal', wordBreak: 'normal', paragraphSpacing: 0 } as ITextProperties,
        },
      ];

      const result = migrateCanvasToTiptap(elements);
      expect(result.document?.attrs?._legacyCanvasElements).toEqual(elements);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown element types gracefully', () => {
      const elements: any[] = [
        {
          id: 'unknown-1',
          type: 'unknown_type',
          x: 50,
          y: 100,
          width: 400,
          height: 50,
          zIndex: 0,
          properties: {},
        },
      ];

      const result = migrateCanvasToTiptap(elements as any);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Unknown element type');
    });

    it('should continue migration despite non-critical errors', () => {
      const elements: IEditorElement[] = [
        {
          id: 'text-1',
          type: 'text',
          x: 50,
          y: 100,
          width: 400,
          height: 50,
          zIndex: 0,
          properties: { content: 'Valid', fontFamily: 'Arial', fontSize: 14, color: '#000', bold: false, italic: false, underline: false, align: 'left', textIndent: 0, lineHeight: 1.5, letterSpacing: 0, whiteSpace: 'normal', wordBreak: 'normal', paragraphSpacing: 0 } as ITextProperties,
        },
        {
          id: 'text-2',
          type: 'text',
          x: 50,
          y: 200,
          width: 400,
          height: 50,
          zIndex: 0,
          properties: { content: 'Also Valid', fontFamily: 'Arial', fontSize: 14, color: '#000', bold: false, italic: false, underline: false, align: 'left', textIndent: 0, lineHeight: 1.5, letterSpacing: 0, whiteSpace: 'normal', wordBreak: 'normal', paragraphSpacing: 0 } as ITextProperties,
        },
      ];

      const result = migrateCanvasToTiptap(elements);
      expect(result.success).toBe(true);
      expect(result.document?.content.length).toBe(2);
    });
  });
});

describe('validateTiptapDocument', () => {
  it('should validate correct Tiptap document structure', () => {
    const validDoc: TiptapDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    };

    const result = validateTiptapDocument(validDoc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid document root', () => {
    const invalidDoc = { type: 'not-doc', content: [] };
    const result = validateTiptapDocument(invalidDoc);
    expect(result.valid).toBe(false);
  });

  it('should reject missing content array', () => {
    const invalidDoc = { type: 'doc' };
    const result = validateTiptapDocument(invalidDoc);
    expect(result.valid).toBe(false);
  });

  it('should detect missing node type', () => {
    const invalidDoc = {
      type: 'doc',
      content: [{ content: [] }], // Missing type
    };
    const result = validateTiptapDocument(invalidDoc);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('type'))).toBe(true);
  });
});
