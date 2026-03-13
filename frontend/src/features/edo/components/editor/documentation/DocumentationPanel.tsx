import React, { useState } from "react";
import {
  Keyboard,
  PlusCircle,
  MousePointer,
  TableIcon,
  Download,
  Copy,
} from "lucide-react";
import DetailedDocumentation from "./DetailedDocumentation";

type DocSection =
  | "hotkeys"
  | "elements"
  | "work"
  | "tables"
  | "export"
  | "copy";

const navItems = [
  { id: "hotkeys", label: "Горячие клавиши", icon: <Keyboard size={16} /> },
  { id: "elements", label: "Элементы", icon: <PlusCircle size={16} /> },
  {
    id: "work",
    label: "Работа с элементами",
    icon: <MousePointer size={16} />,
  },
  { id: "tables", label: "Таблицы", icon: <TableIcon size={16} /> },
  { id: "export", label: "Экспорт", icon: <Download size={16} /> },
  { id: "copy", label: "Копирование", icon: <Copy size={16} /> },
] as const;

const DocumentationPanel: React.FC = () => {
  const [active, setActive] = useState<DocSection>("hotkeys");
  return (
    <div className="documentation-panel">
      <div className="doc-navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`doc-nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => setActive(item.id as DocSection)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="doc-content-wrapper">
        <DetailedDocumentation key={active} section={active} />
      </div>
    </div>
  );
};

export default DocumentationPanel;
