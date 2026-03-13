// src/components/editor/ElementRenderer.tsx

import React, { useState, useRef, useEffect } from "react";
import type {
  IEditorElement,
  ITextProperties,
  IImageProperties,
  ITableProperties,
  IDateProperties,
  ISignatureProperties,
  IDividerProperties,
} from "../../utils/types/editor.types";

interface IElementRendererProps {
  element: IEditorElement;
  isSelected: boolean;
  onSelect: () => void;
  onMouseDown: (e: React.MouseEvent, id: string, handle?: string) => void;
  onUpdateProp: (id: string, props: any) => void;
  onEditSignature?: (id: string) => void;
}

export const ElementRenderer: React.FC<IElementRendererProps> = ({
  element,
  isSelected,
  onSelect,
  onMouseDown,
  onUpdateProp,
  onEditSignature,
}) => {
  // Состояние для inline редактирования текста
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Фокус при входе в режим редактирования
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Ставим курсор в конец
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Выход из редактирования при снятии выделения
  useEffect(() => {
    if (!isSelected && isEditing) {
      setIsEditing(false);
    }
  }, [isSelected, isEditing]);

  const createFileInputAndRead = (
    callback: (file: File, dataUrl: string) => void,
  ) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        callback(f, src);
      };
      reader.readAsDataURL(f);
    };
    inp.click();
  };

  const commonStyle: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    border: isSelected ? "2px solid var(--c-accent)" : "2px solid transparent",
    cursor: isEditing ? "text" : "move",
    transition: "border-color 0.1s ease-out",
    boxSizing: "border-box",
    transform: "translate(0, 0)",
    zIndex: element.zIndex ?? 0,
  };

  const handleMouseDown = (e: React.MouseEvent, handle?: string) => {
    // Не начинаем drag если редактируем текст
    if (isEditing) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    onMouseDown(e, element.id, handle);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.type === "text") {
      setIsEditing(true);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateProp(element.id, { content: e.target.value });
  };

  const handleTextBlur = () => {
    setIsEditing(false);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape - выход из редактирования
    if (e.key === "Escape") {
      setIsEditing(false);
      e.preventDefault();
    }
    // Ctrl+Enter - выход с сохранением
    if (e.key === "Enter" && e.ctrlKey) {
      setIsEditing(false);
      e.preventDefault();
    }
    // Обычный Enter - новая строка (по умолчанию в textarea)
    // Останавливаем всплытие чтобы не триггерить другие хоткеи
    e.stopPropagation();
  };

  // Форматирование текста с абзацами (для отображения)
  const formatTextWithParagraphs = (text: string, props: ITextProperties) => {
    const paragraphs = text.split("\n");

    return paragraphs.map((paragraph, index) => (
      <p
        key={index}
        style={{
          margin: 0,
          marginBottom:
            index < paragraphs.length - 1 ? props.paragraphSpacing : 0,
          textIndent: props.textIndent,
          minHeight: paragraph ? undefined : "1em", // Пустая строка имеет высоту
        }}
      >
        {paragraph || "\u00A0"} {/* Non-breaking space для пустых строк */}
      </p>
    ));
  };

  // ===== TEXT =====
  if (element.type === "text") {
    const props = element.properties as ITextProperties;

    const textStyles: React.CSSProperties = {
      margin: 0,
      padding: 8,
      width: "100%",
      height: "100%",
      fontFamily: props.fontFamily,
      fontSize: props.fontSize,
      color: props.color,
      fontWeight: props.bold ? "bold" : "normal",
      fontStyle: props.italic ? "italic" : "normal",
      textDecoration: props.underline ? "underline" : "none",
      textAlign: props.align,
      lineHeight: props.lineHeight || 1.5,
      letterSpacing: props.letterSpacing || 0,
      whiteSpace: props.whiteSpace || "pre-wrap",
      wordBreak: props.wordBreak || "break-word",
      boxSizing: "border-box",
      overflow: "hidden",
    };

    return (
      <div
        style={commonStyle}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        className="text-element"
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={props.content}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            onMouseDown={(e) => e.stopPropagation()} // Не drag при клике в textarea
            style={{
              ...textStyles,
              border: "none",
              outline: "none",
              resize: "none",
              background: "rgba(255, 255, 255, 0.95)",
              cursor: "text",
              textIndent: props.textIndent,
            }}
            placeholder="Введите текст..."
          />
        ) : (
          <div
            style={{
              ...textStyles,
              userSelect: isSelected ? "text" : "none",
              cursor: "inherit",
            }}
          >
            {formatTextWithParagraphs(props.content, props)}
          </div>
        )}

        {/* Подсказка при выделении */}
        {isSelected && !isEditing && (
          <div
            style={{
              position: "absolute",
              bottom: -24,
              left: 0,
              fontSize: 11,
              color: "#888",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            Двойной клик для редактирования
          </div>
        )}
      </div>
    );
  }

  // ===== IMAGE =====
  // ===== IMAGE =====
  if (element.type === "image") {
    const props = element.properties as IImageProperties;

    const handleImageClick = (e: React.MouseEvent) => {
      e.stopPropagation();

      // Если уже есть src — просто выделяем и ничего не делаем
      if (props.src) {
        onSelect();
        return;
      }

      // Если src нет — открываем загрузку
      createFileInputAndRead((file, src) =>
        onUpdateProp(element.id, { src, alt: file.name, file }),
      );
    };

    return (
      <div
        style={commonStyle}
        onClick={handleImageClick}
        onMouseDown={handleMouseDown}
        className="image-element"
        onDoubleClick={(e) => {
          e.stopPropagation();
          // Двойной клик всегда открывает замену изображения
          createFileInputAndRead((file, src) =>
            onUpdateProp(element.id, { src, alt: file.name, file }),
          );
        }}
      >
        {props.src ? (
          <img
            src={props.src}
            alt={props.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="dropzone">
            <div className="dropzone-icon">Фото</div>
            <p>Нажмите для загрузки</p>
          </div>
        )}
      </div>
    );
  }

  // ===== TABLE =====
  if (element.type === "table") {
    const props = element.properties as ITableProperties;
    return (
      <div
        style={commonStyle}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseDown={handleMouseDown}
        className="table-element"
      >
        <table
          style={{ width: "100%", height: "100%", borderCollapse: "collapse" }}
        >
          <tbody>
            {Array.from({ length: props.rows }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: props.cols }).map((__, j) => (
                  <td
                    key={`${i}-${j}`}
                    contentEditable
                    suppressContentEditableWarning
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const data = [...(props.data || [])];
                      if (!data[i]) data[i] = [];
                      data[i][j] = e.currentTarget.textContent || "";
                      onUpdateProp(element.id, { data });
                    }}
                    style={{
                      border: `${props.borderWidth}px solid ${props.borderColor}`,
                      padding: "8px",
                      background: props.cellBg,
                      minWidth: "60px",
                      outline: "none",
                      cursor: "text",
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
      </div>
    );
  }

  // ===== DATE =====
  if (element.type === "date") {
    const props = element.properties as IDateProperties;
    return (
      <div
        style={commonStyle}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseDown={handleMouseDown}
        className="date-element"
      >
        <input
          type="date"
          value={props.value}
          onChange={(e) => onUpdateProp(element.id, { value: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="date-input"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        />
      </div>
    );
  }

  // ===== SIGNATURE =====
  if (element.type === "signature") {
    const props = element.properties as ISignatureProperties & {
      image?: string;
    };
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const drawing = React.useRef(false);
    const last = React.useRef<{ x: number; y: number } | null>(null);

    const start = (e: React.MouseEvent) => {
      e.stopPropagation(); // ВАЖНО: не триггерим onClick родителя
      if (!canvasRef.current) return;
      drawing.current = true;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width || 1;
      const scaleY = canvasRef.current.height / rect.height || 1;
      last.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const move = (e: React.MouseEvent) => {
      if (!drawing.current || !canvasRef.current || !last.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width || 1;
      const scaleY = canvasRef.current.height / rect.height || 1;
      const nx = (e.clientX - rect.left) * scaleX;
      const ny = (e.clientY - rect.top) * scaleY;
      ctx.strokeStyle = props.color || "#000";
      ctx.lineWidth = Math.max(1, 2 * ((scaleX + scaleY) / 2));
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      last.current = { x: nx, y: ny };
    };

    const end = () => {
      if (!canvasRef.current) return;
      drawing.current = false;
      last.current = null;
      const orig = canvasRef.current;
      const tmp = document.createElement("canvas");
      tmp.width = orig.width;
      tmp.height = orig.height;
      const tctx = tmp.getContext("2d");
      if (tctx) tctx.drawImage(orig, 0, 0);
      const data = tmp.toDataURL("image/png");

      // ВАЖНО: Обновляем props.image, НЕ создаём новый элемент
      onUpdateProp(element.id, { image: data });
    };

    // ГЛАВНОЕ ОТЛИЧИЕ: разделяем клик по контейнеру и клик по canvas
    const handleContainerClick = (e: React.MouseEvent) => {
      // Если клик был по canvas — игнорируем (рисование важнее выделения)
      if ((e.target as HTMLElement).tagName === "CANVAS") {
        e.stopPropagation();
        return;
      }
      // Если клик по img или пустому месту — выделяем
      e.stopPropagation();
      onSelect();
    };

    return (
      <div
        style={commonStyle}
        onClick={handleContainerClick}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditSignature?.(element.id);
        }}
        onMouseDown={handleMouseDown}
        className="signature-element"
      >
        {props.image ? (
          <img
            src={props.image}
            alt="Signature"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            draggable={false}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={Math.max(200, element.width)}
            height={Math.max(60, element.height)}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            style={{
              width: "100%",
              height: "100%",
              background: "transparent",
              cursor: isSelected ? "crosshair" : "pointer",
              touchAction: "none",
            }}
          />
        )}
      </div>
    );
  }
  // ===== DIVIDER =====
  if (element.type === "divider") {
    const props = element.properties as IDividerProperties;
    return (
      <div
        style={commonStyle}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseDown={handleMouseDown}
        className="divider-element"
      >
        <div
          style={{
            borderTop: `${props.thickness}px ${props.style} ${props.color}`,
            width: "100%",
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      </div>
    );
  }

  return null;
};
