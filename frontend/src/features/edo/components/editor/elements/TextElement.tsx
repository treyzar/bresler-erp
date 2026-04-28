import React, { useState, useRef, useEffect } from "react"
import type { ITextProperties } from "../../../utils/types/editor.types"
import { getCommonStyle } from "./helpers"
import type { IElementProps } from "./types"

function formatTextWithParagraphs(text: string, props: ITextProperties) {
  const paragraphs = text.split("\n")
  return paragraphs.map((paragraph, index) => (
    <p
      key={index}
      style={{
        margin: 0,
        marginBottom: index < paragraphs.length - 1 ? props.paragraphSpacing : 0,
        textIndent: props.textIndent,
        minHeight: paragraph ? undefined : "1em",
      }}
    >
      {paragraph || " "}
    </p>
  ))
}

export const TextElement: React.FC<IElementProps> = ({
  element,
  isSelected,
  onSelect,
  onMouseDown,
  onUpdateProp,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const props = element.properties as ITextProperties

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  useEffect(() => {
    if (!isSelected && isEditing) {
      setIsEditing(false)
    }
  }, [isSelected, isEditing])

  const commonStyle = getCommonStyle(element, isSelected, isEditing)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) {
      e.stopPropagation()
      return
    }
    e.stopPropagation()
    onMouseDown(e, element.id)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateProp(element.id, { content: e.target.value })
  }

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setIsEditing(false)
      e.preventDefault()
    }
    if (e.key === "Enter" && e.ctrlKey) {
      setIsEditing(false)
      e.preventDefault()
    }
    e.stopPropagation()
  }

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
  }

  return (
    <div
      style={commonStyle}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
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
          onBlur={() => setIsEditing(false)}
          onKeyDown={handleTextKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
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
  )
}
