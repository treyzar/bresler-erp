// src/features/edo/utils/migration/canvasToTiptap.ts
/**
 * Migration utility: Converts Canvas-based editor elements to Tiptap JSON structure
 * 
 * Mapping Table:
 * ┌─────────────────┬───────────────────────┬─────────────────────────────────────────┐
 * │ Canvas Element  │ Tiptap Node           │ Notes                                     │
 * ├─────────────────┼───────────────────────┼─────────────────────────────────────────┤
 * │ text            │ paragraph             │ With textStyle marks for font properties │
 * │ table           │ table                 │ Nested conversion via tableConverter.ts  │
 * │ image           │ image                 │ Base64 or URL preserved                   │
 * │ signature       │ image + paragraph     │ Image if exists, else text placeholder   │
 * │ divider         │ horizontalRule        │ Mapped to HR with custom attrs           │
 * │ date            │ paragraph             │ Simple text with textStyle               │
 * └─────────────────┴───────────────────────┴─────────────────────────────────────────┘
 */

import type {
  IEditorElement,
  ITextProperties,
  ITableProperties,
  IImageProperties,
  ISignatureProperties,
  IDividerProperties,
  IDateProperties,
} from '../types/editor.types';

import type {
  TiptapDocument,
  TiptapContentNode,
  TiptapDocumentAttrs,
  TiptapMark,
  TiptapText,
  MigrationResult,
  MigrationError,
  MigrationWarning,
} from '../types/tiptap.types';

import { A4_WIDTH, A4_HEIGHT } from '../constants/editor.constants';

// Import table converter (will be created in Phase 3)
// import { convertCanvasTableToTiptapTable } from './tableConverter';

/**
 * Creates text marks from Canvas text properties
 */
function createTextMarks(props: Partial<ITextProperties>): TiptapMark[] {
  const marks: TiptapMark[] = [];

  if (props.bold) marks.push({ type: 'bold' });
  if (props.italic) marks.push({ type: 'italic' });
  if (props.underline) marks.push({ type: 'underline' });

  // TextStyle for font properties
  if (props.fontFamily || props.fontSize || props.color) {
    marks.push({
      type: 'textStyle',
      attrs: {
        fontFamily: props.fontFamily,
        fontSize: props.fontSize ? `${props.fontSize}px` : undefined,
        color: props.color,
      },
    });
  }

  return marks;
}

/**
 * Converts a single Canvas text element to Tiptap paragraph
 */
function convertTextElement(element: IEditorElement): TiptapContentNode | null {
  const props = element.properties as ITextProperties;

  const content: TiptapText[] = [];
  if (props.content) {
    // Handle multi-line text - split by newlines
    const lines = props.content.split('\n');
    lines.forEach((line, index) => {
      content.push({
        type: 'text',
        text: line,
        marks: createTextMarks(props),
      });
      if (index < lines.length - 1) {
        // Add hard break between lines
        // Note: hardBreak would need to be added as inline node
      }
    });
  }

  return {
    type: 'paragraph',
    content: content.length > 0 ? content : undefined,
    attrs: {
      textAlign: props.align || 'left',
      textIndent: props.textIndent || 0,
      lineHeight: props.lineHeight || 1.5,
      letterSpacing: props.letterSpacing || 0,
      marginTop: props.paragraphSpacing || 0,
      marginBottom: props.paragraphSpacing || 0,
    },
  };
}

/**
 * Converts a Canvas image element to Tiptap image node
 */
function convertImageElement(element: IEditorElement): TiptapContentNode | null {
  const props = element.properties as IImageProperties;

  return {
    type: 'image',
    attrs: {
      src: props.src || '',
      alt: props.alt || 'Image',
      width: element.width,
      height: element.height,
      align: 'left', // Default alignment
    },
  };
}

/**
 * Converts a Canvas signature element to Tiptap nodes
 */
function convertSignatureElement(element: IEditorElement): TiptapContentNode | null {
  const props = element.properties as ISignatureProperties;

  if (props.image) {
    // Return image node for signature
    return {
      type: 'image',
      attrs: {
        src: props.image,
        alt: 'Signature',
        width: element.width,
        height: element.height,
        align: 'left',
      },
    };
  }

  // Fallback to text placeholder
  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: props.text || 'Подпись: __________',
        marks: [
          {
            type: 'textStyle',
            attrs: {
              fontSize: `${props.fontSize || 12}px`,
              color: props.color || '#000000',
            },
          },
          {
            type: 'italic',
          },
        ],
      },
    ],
  };
}

/**
 * Converts a Canvas divider element to Tiptap horizontal rule
 */
function convertDividerElement(element: IEditorElement): TiptapContentNode | null {
  const props = element.properties as IDividerProperties;

  return {
    type: 'horizontalRule',
    attrs: {
      thickness: props.thickness || 1,
      color: props.color || '#000000',
      style: props.style || 'solid',
    },
  };
}

/**
 * Converts a Canvas date element to Tiptap paragraph
 */
function convertDateElement(element: IEditorElement): TiptapContentNode | null {
  const props = element.properties as IDateProperties;

  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: props.value || '',
        marks: [
          {
            type: 'textStyle',
            attrs: {
              fontSize: '14px',
            },
          },
        ],
      },
    ],
  };
}

/**
 * Converts a Canvas table element to Tiptap table
 * Delegates to tableConverter.ts for complex 2D array transformation
 */
function convertTableElement(element: IEditorElement): TiptapContentNode | null {
  const props = element.properties as ITableProperties;

  // Placeholder - full implementation in Phase 3
  // For now, return a basic table structure
  if (props.cells && props.columns) {
    // Will be replaced with proper converter in Phase 3
    return convertCanvasTableToTiptapTable(element);
  }

  // Fallback for old format (data array)
  if (props.data && Array.isArray(props.data)) {
    const rows = props.data.map((rowData) => ({
      type: 'tableRow' as const,
      content: rowData.map((cellText) => ({
        type: 'tableCell' as const,
        content: [
          {
            type: 'paragraph' as const,
            content: [
              {
                type: 'text' as const,
                text: cellText || '',
              },
            ],
          },
        ],
      })),
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

  return null;
}

/**
 * Stub for table converter - full implementation in Phase 3
 */
function convertCanvasTableToTiptapTable(element: IEditorElement): TiptapContentNode | null {
  const props = element.properties as ITableProperties;

  if (!props.cells || !props.columns) {
    return null;
  }

  // Convert 2D cells array to Tiptap table structure
  const rows: any[] = [];

  for (let r = 0; r < props.cells.length; r++) {
    const row = props.cells[r];
    if (!row) continue;

    const tiptapRow: any = {
      type: 'tableRow',
      content: [],
    };

    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell === null) continue; // Skip merged cells

      const tiptapCell: any = {
        type: cell.rowSpan === 1 && cell.colSpan === 1 ? 'tableCell' : 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: cell.content
              ? [
                  {
                    type: 'text',
                    text: cell.content,
                    marks: cell.style?.color
                      ? [
                          {
                            type: 'textStyle',
                            attrs: {
                              color: cell.style.color,
                            },
                          },
                        ]
                      : [],
                  },
                ]
              : [],
          },
        ],
        attrs: {
          colspan: cell.colSpan || 1,
          rowspan: cell.rowSpan || 1,
          backgroundColor: cell.style?.backgroundColor,
          textAlign: cell.style?.textAlign || 'left',
          borderWidth: cell.style?.borderWidth || props.borderWidth || 1,
          borderColor: cell.style?.borderColor || props.borderColor || '#000000',
        },
      };

      tiptapRow.content.push(tiptapCell);
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
 * Main conversion function: Canvas elements array → Tiptap Document
 */
export function migrateCanvasToTiptap(
  canvasElements: IEditorElement[],
  customAttrs?: Partial<TiptapDocumentAttrs>
): MigrationResult {
  const errors: MigrationError[] = [];
  const warnings: MigrationWarning[] = [];
  const content: TiptapContentNode[] = [];

  // Sort elements by Y position (top to bottom), then by X (left to right)
  // This preserves the visual order in flow-based layout
  const sortedElements = [...canvasElements].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 20) {
      // Significant Y difference - sort by Y
      return yDiff;
    }
    // Same "line" - sort by X
    return a.x - b.x;
  });

  for (const element of sortedElements) {
    try {
      let converted: TiptapContentNode | null = null;

      switch (element.type) {
        case 'text':
          converted = convertTextElement(element);
          break;
        case 'image':
          converted = convertImageElement(element);
          break;
        case 'table':
          converted = convertTableElement(element);
          break;
        case 'signature':
          converted = convertSignatureElement(element);
          break;
        case 'divider':
          converted = convertDividerElement(element);
          break;
        case 'date':
          converted = convertDateElement(element);
          break;
        default:
          warnings.push({
            elementId: element.id,
            message: `Unknown element type: ${element.type}`,
            suggestion: 'This element will be skipped in migration',
          });
          continue;
      }

      if (converted) {
        content.push(converted);
      } else {
        warnings.push({
          elementId: element.id,
          message: `Failed to convert ${element.type} element`,
          suggestion: 'Check element properties for missing data',
        });
      }
    } catch (error) {
      errors.push({
        elementId: element.id,
        message: error instanceof Error ? error.message : 'Unknown conversion error',
        critical: false,
      });
    }
  }

  // Build final Tiptap document
  const document: TiptapDocument = {
    type: 'doc',
    content,
    attrs: {
      pageWidth: A4_WIDTH,
      pageHeight: A4_HEIGHT,
      marginTop: 96, // ~1 inch
      marginRight: 96,
      marginBottom: 96,
      marginLeft: 96,
      fontFamily: 'Arial',
      fontSize: 14,
      lineHeight: 1.5,
      color: '#000000',
      ...customAttrs,
      // Store legacy elements for rollback/debugging
      _legacyCanvasElements: canvasElements,
    },
  };

  return {
    success: errors.length === 0 || !errors.some((e) => e.critical),
    document,
    errors,
    warnings,
  };
}

/**
 * Reverse migration: Tiptap Document → Canvas elements (for rollback)
 */
export function migrateTiptapToCanvas(_document: TiptapDocument): IEditorElement[] {
  // Placeholder for reverse migration
  // Would be used for rollback or hybrid editing modes
  console.warn('Reverse migration (Tiptap → Canvas) is not fully implemented');
  return [];
}

/**
 * Validates Tiptap document structure
 */
export function validateTiptapDocument(document: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!document || typeof document !== 'object') {
    errors.push('Document is not an object');
    return { valid: false, errors };
  }

  if (document.type !== 'doc') {
    errors.push('Document root type must be "doc"');
  }

  if (!Array.isArray(document.content)) {
    errors.push('Document content must be an array');
    return { valid: false, errors };
  }

  // Validate each content node
  for (const node of document.content) {
    if (!node.type) {
      errors.push('Content node missing "type" property');
      continue;
    }

    // Type-specific validation
    if (node.type === 'table' && !Array.isArray(node.content)) {
      errors.push('Table node must have content array');
    }

    if (node.type === 'image' && (!node.attrs || !node.attrs.src)) {
      errors.push('Image node must have src attribute');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
