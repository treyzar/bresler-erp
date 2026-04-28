export type BlockType = 'paragraph' | 'heading' | 'image' | 'table';

export interface BlockStyle {
  align?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
}

export interface BlockPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Block {
  type: BlockType;
  content: unknown;
  style?: BlockStyle;
  position?: BlockPosition;
}

export interface DocumentJSON {
  blocks: Block[];
  filename?: string;
}

/**
 * Преобразует состояние редактора (стейт Canvas или DOM) в структурированный JSON.
 * В данном случае реализуем базовую логику парсинга DOM-элементов редактора.
 */
export const editorToJson = (containerId: string): Block[] => {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const blocks: Block[] = [];
  
  // В реальном приложении мы бы обходили стейт (например, Slate.js или Prosemirror)
  // Но по ТЗ "DOM-узлы или стейт Canvas". Реализуем обход дочерних элементов.
  const children = Array.from(container.children);

  children.forEach((child) => {
    const style: BlockStyle = {};
    const computedStyle = window.getComputedStyle(child);
    
    // Определяем выравнивание
    if (computedStyle.textAlign === 'center') style.align = 'center';
    else if (computedStyle.textAlign === 'right') style.align = 'right';
    else if (computedStyle.textAlign === 'justify') style.align = 'justify';
    else style.align = 'left';

    // Заголовки
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(child.tagName)) {
      blocks.push({
        type: 'heading',
        content: child.textContent || '',
        style: { ...style, bold: true }
      });
    } 
    // Изображения
    else if (child.tagName === 'IMG' || child.querySelector('img')) {
      const img = child.tagName === 'IMG' ? (child as HTMLImageElement) : child.querySelector('img');
      if (img && img.src.startsWith('data:image')) {
        blocks.push({
          type: 'image',
          content: img.src,
          style
        });
      }
    }
    // Таблицы
    else if (child.tagName === 'TABLE') {
      const tableData: string[][] = [];
      const rows = Array.from(child.querySelectorAll('tr'));
      rows.forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent || '');
        tableData.push(rowData);
      });
      blocks.push({
        type: 'table',
        content: tableData,
        style
      });
    }
    // Параграфы (все остальное)
    else {
      blocks.push({
        type: 'paragraph',
        content: child.textContent || '',
        style: {
          ...style,
          bold: computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 600,
          italic: computedStyle.fontStyle === 'italic'
        }
      });
    }
  });

  return blocks;
};
