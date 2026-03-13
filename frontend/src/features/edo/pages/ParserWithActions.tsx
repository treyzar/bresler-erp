import { useState } from "react";
import { useNavigate } from "react-router";
import { templatesApi } from "../api/client";
import ParserPage from "./Parser";
import type { ParsedDocument, TemplateType } from "../api/types";
import type { VisibilityType } from "../api/types";

export default function ParserWithActions() {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<ParsedDocument | null>(null);

  const saveAsTemplate = async () => {
    if (!doc?.extracted_text) return;
    const payload = {
      title: `Парсинг ${doc.original_filename}`,
      description: `Авто-создан из документа ${doc.original_filename}`,
      visibility: "PUBLIC" as VisibilityType,
      template_type: "HTML" as TemplateType,
      html_content: `<pre style="white-space:pre-wrap;font-family:Inter">${doc.extracted_text}</pre>`,
      allowed_users: [],
    };
    try {
      const newTpl = await templatesApi.create(payload);
      navigate(`/templates/${newTpl.id}`);
    } catch (e: any) {
      alert("Не удалось сохранить шаблон: " + e);
    }
  };

  /* 2. Редактировать в конструкторе → Editor с предзаполненным текстом */
  const openInEditor = () => {
    if (!doc) return;
    navigate("/templates/new", { state: { prefillText: doc.extracted_text } });
  };

  return (
    <div>
      {/* встраиваем ваш существующий компонент */}
      <ParserPage onResultChange={setDoc} />

      {doc && (
        <div className="surface mt-4" style={{ padding: "var(--sp-6)" }}>
          <h3>Дальнейшие действия</h3>
          <div className="flex gap-3 mt-4">
            <button className="btn btn-primary" onClick={saveAsTemplate}>
              Сохранить как шаблон
            </button>
            <button className="btn btn-secondary" onClick={openInEditor}>
              Редактировать в конструкторе
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
