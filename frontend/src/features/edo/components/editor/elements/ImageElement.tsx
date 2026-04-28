import React from "react"
import type { IImageProperties } from "../../../utils/types/editor.types"
import { createFileInputAndRead, getCommonStyle } from "./helpers"
import type { IElementProps } from "./types"

export const ImageElement: React.FC<IElementProps> = ({
  element,
  isSelected,
  onSelect,
  onMouseDown,
  onUpdateProp,
}) => {
  const props = element.properties as IImageProperties
  const commonStyle = getCommonStyle(element, isSelected)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMouseDown(e, element.id)
  }

  return (
    <div
      style={commonStyle}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onMouseDown={handleMouseDown}
      className="image-element"
      onDoubleClick={(e) => {
        e.stopPropagation()
        createFileInputAndRead((file, src) =>
          onUpdateProp(element.id, { src, alt: file.name, file }),
        )
      }}
    >
      {props.src ? (
        <img
          src={props.src}
          alt={props.alt}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          draggable={false}
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      ) : (
        <div
          className="dropzone"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "#f8fafc",
            color: "#1f2937",
            border: "1px dashed #94a3b8",
            textAlign: "center",
            padding: 8,
          }}
        >
          <div
            className="dropzone-icon"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Фото
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#334155",
            }}
          >
            Двойной клик, чтобы вставить изображение
          </p>
        </div>
      )}
    </div>
  )
}
