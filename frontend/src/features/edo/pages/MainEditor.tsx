// src/components/editor/Editor.tsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { saveAs } from "file-saver";

/* API и константы */
import { templatesApi } from "../api/client";
import {
  LOCALSTORAGE_KEY,
  A4_HEIGHT,
  A4_WIDTH,
} from "../utils/constants/editor.constants";
import type {
  IEditorElement,
  TVisibilityType,
} from "../utils/types/editor.types";
import type { TemplateType, VisibilityType } from "../api/types";
/* Иконки */
import {
  HelpCircle,
  Save,
  ChevronLeft,
} from "lucide-react";

/* ---------- компоненты ---------- */
import Canvas from "../components/editor/Canvas";
import CanvasToolbar from "../components/editor/CanvasToolbar";
import ElementsPanel from "../components/editor/ElementsPanel";
import PropertiesPanel from "../components/editor/PropertiesPanel";
import Modal from "../components/editor/documentation/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ---------- хуки ---------- */
import { useAutoZoom } from "../hooks/useAutoZoom";
import { useHistory } from "../hooks/useHistory";
import { useDragResize } from "../hooks/useDragResize";
import { useKeyboard } from "../hooks/useKeyboard";

/* ---------- утилиты ---------- */
import { generateId } from "../utils/help/generateID";
import { parseHtmlToElements } from "../utils/help/parseHtmlToElements";
import { snapToGrid } from "../utils/help/snapToGrid";
import { createDefaultElement } from "../utils/help/createDefaultElement";
import { generateDocx } from "../utils/help/generateDocx";
import { generatePdf } from "../utils/help/generatePDF";
import {
  replacePlaceholdersInElements,
  replacePlaceholdersInString,
} from "../utils/help/replacePlaceholders";

export default function Editor() {
  const navigate = useNavigate();
  const location = useLocation();

  /* --- ПОЛУЧЕНИЕ ДАННЫХ ИЗ НАВИГАЦИИ --- */
  const state = location.state as any;
  const prefill = state?.prefillText as string | undefined;
  const importedElements = state?.importedElements as
    | IEditorElement[]
    | undefined;
  const importedTitle = state?.title as string | undefined;
  const editingTemplateId = state?.templateId as number | undefined;
  const letterId = state?.letterId as number | undefined;
  const letterData = state?.letterData as Record<string, string> | undefined;

  /* ---------- состояние ---------- */
  const [elements, setElements] = useState<IEditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Тип шаблона (PDF по умолчанию, так как это основной запрос)
  const [templateType, setTemplateType] = useState<TemplateType>("PDF");
  const [visibility, setVisibility] = useState<VisibilityType>("PUBLIC");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gridVisible, setGridVisible] = useState(true);
  const [gridSnap, setGridSnap] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  /* ---------- история ---------- */
  const { saveToHistory, undo, redo, canUndo, canRedo } = useHistory(elements);

  /* подпись: редактирование */
  const [isSigOpen, setIsSigOpen] = useState(false);
  const [sigEditId, setSigEditId] = useState<string | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sigDrawing = useRef(false);

  /* ---------- зум ---------- */
  const canvasContainerRef = useRef<HTMLDivElement>(null!);
  const { zoom, autoZoom, isManualZoom, setZoom } =
    useAutoZoom(canvasContainerRef);

  /* ---------- helpers ---------- */
  const updateElement = useCallback(
    (id: string, upd: Partial<IEditorElement>) => {
      const next = elements.map((el) =>
        el.id === id ? { ...el, ...upd } : el,
      );
      setElements(next);
      saveToHistory(next);
    },
    [elements, saveToHistory],
  );

  const updateElementPosition = useCallback(
    (id: string, upd: Partial<IEditorElement>) => {
      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...upd } : el)),
      );
    },
    [],
  );

  const updateProperties = useCallback(
    (id: string, props: any) => {
      const next = elements.map((el) =>
        el.id === id
          ? { ...el, properties: { ...el.properties, ...props } }
          : el,
      );
      setElements(next);
      saveToHistory(next);
    },
    [elements, saveToHistory],
  );

  const handleOpenSignatureEditor = (id: string) => {
    setSigEditId(id);
    setIsSigOpen(true);
    setTimeout(() => {
      const el = elements.find((i) => i.id === id);
      const props = (el?.properties || {}) as any;
      const canvas = sigCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (props.image) {
        const img = new Image();
        img.onload = () =>
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.src = props.image;
      }
    }, 50);
  };

  const deleteElement = useCallback(
    (id: string) => {
      const next = elements.filter((el) => el.id !== id);
      setElements(next);
      saveToHistory(next);
      setSelectedId(null);
    },
    [elements, saveToHistory],
  );

  const moveLayer = useCallback(
    (id: string, dir: "front" | "back") => {
      const arr = [...elements];
      const idx = arr.findIndex((el) => el.id === id);
      if (idx === -1) return;
      const [el] = arr.splice(idx, 1);
      dir === "front" ? arr.push(el) : arr.unshift(el);
      const next = arr.map((e, i) => ({ ...e, zIndex: i }));
      setElements(next);
      saveToHistory(next);
    },
    [elements, saveToHistory],
  );

  /* ---------- drag/resize ---------- */
  const {
    isDragging,
    isResizing,
    startDrag,
    startResize,
    stopDragResize,
    handleMouseMove,
  } = useDragResize();

  /* ---------- клавиатура ---------- */
  useKeyboard({
    selectedId,
    elements,
    setElements,
    saveToHistory,
    setSelectedId,
    deleteElement,
    undo,
    redo,
  });

  /* ---------- экспорт DOCX ---------- */
  const exportDocx = async () => {
    if (!elements.length) return setError("Нет элементов");
    setLoading(true);
    try {
      const blob = await generateDocx(elements, title, description);
      saveAs(blob, `${title || "document"}.docx`);
    } catch (e: any) {
      setError("Ошибка DOCX: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- экспорт HTML ---------- */
  const exportHtml = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:Inter,Arial,sans-serif;margin:0;padding:20px;position:relative;width:794px;min-height:1123px;background:white;}.container{position:relative;width:100%;height:100%;}*{box-sizing:border-box;}@media print{body{width:210mm;min-height:297mm;}}</style></head><body><div class="container">${elements
      .map((el) => {
        if (el.type === "text") {
          const {
            content,
            fontFamily,
            fontSize,
            color,
            bold,
            italic,
            underline,
            align,
          } = el.properties as any;
          return `<div style="position:absolute;left:${el.x}px;top:${
            el.y
          }px;width:${el.width}px;height:${
            el.height
          }px"><p style="margin:0;font-family:${fontFamily};font-size:${fontSize}px;color:${color};font-weight:${
            bold ? "bold" : "normal"
          };font-style:${italic ? "italic" : "normal"};text-decoration:${
            underline ? "underline" : "none"
          };text-align:${align}">${content}</p></div>`;
        }
        if (el.type === "image") {
          const { src, alt } = el.properties as any;
          return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px"><img src="${src}" alt="${alt}" style="width:100%;height:100%;object-fit:cover"></div>`;
        }
        if (el.type === "signature") {
          const p = el.properties as any;
          if (p.image) {
            return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px"><img src="${p.image}" alt="signature" style="width:100%;height:100%;object-fit:contain"></div>`;
          }
          return `<div style="position:absolute;left:${el.x}px;top:${
            el.y
          }px;width:${el.width}px;height:${
            el.height
          }px;display:flex;align-items:center;justify-content:center"><span>${
            p.text || ""
          }</span></div>`;
        }
        if (el.type === "divider") {
          const p = el.properties as any;
          return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px"><hr style="border:none;border-top:${p.thickness}px ${p.style} ${p.color};margin:0;" /></div>`;
        }
        return "";
      })
      .join("")}</div></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    saveAs(blob, `${title || "template"}.html`);
  };

  /* ---------- экспорт PDF ---------- */
  const exportPdf = async () => {
    if (!elements.length) return setError("Нет элементов");
    setLoading(true);
    try {
      await generatePdf(elements, title);
    } catch (e: any) {
      setError("Ошибка PDF: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- СОХРАНЕНИЕ НА СЕРВЕР ---------- */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Введите название");
    if (!elements.length) return setError("Добавьте элементы");

    setLoading(true);
    try {
      // 1. Стандартизация JSON (editor_content) для бэкенда
      const cleanEditorContent = elements.map((el) => {
        const p = el.properties as any;
        return {
          id: el.id,
          type: el.type,
          x: Math.round(Number(el.x)) || 0,
          y: Math.round(Number(el.y)) || 0,
          width: Math.round(Number(el.width)) || 100,
          height: Math.round(Number(el.height)) || 40,
          content: p.content || p.text || "",
          isBold: !!p.bold,
          isItalic: !!p.italic,
          fontSize: p.fontSize || 14,
          align: p.align || "left",
        };
      });

      // 2. Генерируем ЧИСТЫЙ HTML (без артефактов редактора)
      const cleanHtmlContent = `
        <div class="canvas-print" style="position:relative; width:794px; min-height:1123px; background:white; margin:0 auto;">
          ${elements
            .map((el) => {
              const commonStyle = `position:absolute; left:${el.x}px; top:${el.y}px; width:${el.width}px; height:${el.height}px;`;
              
              if (el.type === "text") {
                const {
                  content,
                  fontFamily,
                  fontSize,
                  color,
                  bold,
                  italic,
                  underline,
                  align,
                } = el.properties as any;
                return `
                  <div style="${commonStyle}">
                    <p style="margin:0; font-family:${fontFamily || "Arial"}; font-size:${fontSize}px; color:${color || "#000"}; 
                       font-weight:${bold ? "bold" : "normal"}; font-style:${italic ? "italic" : "normal"}; 
                       text-decoration:${underline ? "underline" : "none"}; text-align:${align || "left"};">
                      ${content || ""}
                    </p>
                  </div>`;
              }
              
              if (el.type === "signature") {
                const p = el.properties as any;
                if (p.image) {
                  return `<div style="${commonStyle}"><img src="${p.image}" alt="signature" style="width:100%; height:100%; object-fit:contain;" /></div>`;
                }
                return `<div style="${commonStyle} display:flex; align-items:center; justify-content:center; border-bottom:1px solid #000;">
                          <span style="font-size:12px;">${p.text || "Подпись"}</span>
                        </div>`;
              }

              if (el.type === "image") {
                const { src, alt } = el.properties as any;
                return `<div style="${commonStyle}"><img src="${src}" alt="${alt || ""}" style="width:100%; height:100%; object-fit:cover;" /></div>`;
              }

              if (el.type === "divider") {
                const p = el.properties as any;
                return `<div style="${commonStyle}"><hr style="border:none; border-top:${p.thickness || 1}px ${p.style || "solid"} ${p.color || "#000"}; margin:0;" /></div>`;
              }

              return "";
            })
            .join("")}
        </div>`.trim();

      // 3. Формируем тело запроса
      const payload = {
        title,
        description,
        visibility,
        template_type: templateType,
        editor_content: cleanEditorContent,
        html_content: cleanHtmlContent,
        allowed_users: [],
      };

      if (editingTemplateId) {
        await templatesApi.update(editingTemplateId, payload);
      } else {
        await templatesApi.create(payload);
      }

      localStorage.removeItem(LOCALSTORAGE_KEY);
      navigate("/edo/templates");
    } catch (err: any) {
      setError(err.response?.data?.error || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- useEffects (ЗАГРУЗКА ДАННЫХ) ---------- */
  useEffect(() => {
    /* 1. ПРИОРИТЕТ: Импорт из парсера (PDF/DOCX/HTML) */
    if (importedElements && importedElements.length > 0) {
      const adjustedElements = importedElements.map((el) => {
        if (el.type === "text") {
          const p = el.properties as any;
          if (p.content) {
            const fontSize = p.fontSize || 14;
            const width = el.width || 300;
            const charsPerLine = Math.max(10, width / (fontSize * 0.6));
            const explicitLines = (p.content as string).split("\n");
            let totalLines = 0;
            for (const line of explicitLines) {
              totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
            }
            const estimatedHeight = totalLines * fontSize * 1.5;
            return {
              ...el,
              height: Math.max(el.height, estimatedHeight + 40),
            };
          }
        } else if (el.type === "table") {
          const p = el.properties as any;
          const cols = p.cols || 1;
          const rows = p.rows || 1;
          const estimatedWidth = Math.max(el.width || 400, cols * 80);
          const estimatedHeight = Math.max(el.height || 200, rows * 40);
          return {
            ...el,
            width: estimatedWidth,
            height: estimatedHeight,
          };
        }
        return el;
      });

      setElements(adjustedElements);
      saveToHistory(adjustedElements);
      if (importedTitle) setTitle(importedTitle);
      localStorage.removeItem(LOCALSTORAGE_KEY);
      return;
    }

    /* 2. ПРИОРИТЕТ: Редактирование существующего шаблона */
    if (editingTemplateId) {
      const fetchTemplate = async () => {
        try {
          const tpl = await templatesApi.get(editingTemplateId);
          setTitle(tpl.title || "");
          setDescription(tpl.description || "");
          setVisibility(tpl.visibility || "PUBLIC");
          if (tpl.template_type) setTemplateType(tpl.template_type as any);

          if (
            tpl.editor_content &&
            Array.isArray(tpl.editor_content) &&
            tpl.editor_content.length > 0
          ) {
            let nextElements = tpl.editor_content as any[];
            if (letterData) {
              nextElements = replacePlaceholdersInElements(
                nextElements,
                letterData,
              );
            }
            setElements(nextElements);
            saveToHistory(nextElements);
          } else if (tpl.html_content) {
            try {
              let html = tpl.html_content as string;
              if (letterData) {
                html = replacePlaceholdersInString(html, letterData);
              }
              const parsed = parseHtmlToElements(html);
              if (parsed && parsed.length) {
                setElements(parsed);
                saveToHistory(parsed);
              }
            } catch (e) {
              /* fallback */
            }
          }
        } catch (e) {
          setError("Ошибка загрузки шаблона: " + e);
        }
      };
      fetchTemplate();
      return;
    }

    /* 3. ПРИОРИТЕТ: Prefill (простой текст) - из письма */
    if (prefill) {
      const el = createDefaultElement("text", generateId(), snapToGrid);
      el.properties = { ...(el.properties as any), content: prefill };
      
      // Делаем ширину больше для длинного текста по умолчанию
      el.width = 700;
      el.x = snapToGrid(47); // (794 - 700) / 2 = 47

      const p = el.properties as any;
      const fontSize = p.fontSize || 14;
      const charsPerLine = Math.max(10, el.width / (fontSize * 0.6));
      const explicitLines = (prefill as string).split("\n");
      let totalLines = 0;
      for (const line of explicitLines) {
        totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }
      const estimatedHeight = totalLines * fontSize * 1.5;
      el.height = Math.max(el.height, estimatedHeight + 40);

      const next = [el];
      setElements(next);
      saveToHistory(next);
      setSelectedId(el.id);
      
      if (letterId) {
        setTitle(`Документ по письму №${state?.letterNumber || letterId}`);
      }
      return;
    }

    /* 4. ПРИОРИТЕТ: Черновик из LocalStorage */
    const draft = localStorage.getItem(LOCALSTORAGE_KEY);
    if (draft) {
      try {
        const { elements: els, title: t, description: d } = JSON.parse(draft);
        if (els && els.length > 0) {
          setElements(els);
          setTitle(t || "");
          setDescription(d || "");
          saveToHistory(els);
          return;
        }
      } catch {}
    }
  }, []); // Выполняется один раз при монтировании

  /* Автосохранение черновика */
  useEffect(() => {
    const t = setInterval(() => {
      if (elements.length > 0) {
        localStorage.setItem(
          LOCALSTORAGE_KEY,
          JSON.stringify({ elements, title, description }),
        );
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [elements, title, description]);

  /* ---------- Обработчики ---------- */
  const handleImageUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const newEl: IEditorElement = {
          id: generateId(),
          type: "image",
          x: snapToGrid(A4_WIDTH / 2 - 125),
          y: snapToGrid(A4_HEIGHT / 2 - 100),
          width: 250,
          height: 200,
          zIndex: elements.length,
          properties: { src, alt: file.name, file },
        };
        const next = [...elements, newEl];
        setElements(next);
        saveToHistory(next);
        setSelectedId(newEl.id);
      };
      reader.readAsDataURL(file);
    },
    [elements, snapToGrid],
  );

  const saveSignatureFromModal = () => {
    if (!sigEditId || !sigCanvasRef.current) return;
    const data = sigCanvasRef.current.toDataURL("image/png");
    updateProperties(sigEditId, { image: data });
    setIsSigOpen(false);
    setSigEditId(null);
  };

  const handleUndo = () => {
    const res = undo();
    setElements(res);
    setSelectedId(null);
  };

  const handleRedo = () => {
    const res = redo();
    setElements(res);
    setSelectedId(null);
  };

  /* ---------- глобальный обработчик мыши ---------- */
  const canvasRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef(elements);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;

      const node = canvasRef.current;
      if (!node) return;

      const currentSnap = e.shiftKey ? (v: number) => v : (v: number) => snapToGrid(v, GRID_SIZE);

      handleMouseMove(
        e,
        node.getBoundingClientRect(),
        zoom,
        elementsRef.current,
        selectedId,
        updateElementPosition,
        currentSnap,
        gridSnap,
      );
    };

    const onUp = () => {
      if (isDragging || isResizing) {
        saveToHistory(elementsRef.current);
      }
      stopDragResize();
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [
    isDragging,
    isResizing,
    selectedId,
    zoom,
    gridSnap,
    handleMouseMove,
    updateElementPosition,
    saveToHistory,
    stopDragResize,
  ]);

  // Вычисляем общее количество страниц
  const totalPages = React.useMemo(() => {
    if (elements.length === 0) return 1;
    const maxY = Math.max(...elements.map((el) => {
      let h = el.height;
      if (el.type === "table") {
         const props = el.properties as any;
         const rows = props.rows || 1;
         h = Math.max(h, rows * 40); 
      }
      return el.y + h;
    }));
    return Math.max(1, Math.ceil(maxY / 1123)); // 1123 is PAGE_HEIGHT from Canvas
  }, [elements]);

  /* ---------- RENDER ---------- */
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* 1. Навигация & Область настроек */}
      <div className="border-b bg-card text-card-foreground">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="-ml-3 hidden sm:inline-flex"
              onClick={() => navigate("/edo/templates")}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Input
                className="h-8 border-transparent hover:border-border focus-visible:ring-1 bg-transparent font-medium text-lg w-[200px]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Без названия"
              />
              <Input
                className="h-8 border-transparent hover:border-border focus-visible:ring-1 bg-transparent text-sm text-muted-foreground w-[300px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Добавить описание..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                Справка
             </Button>

              <div className="flex items-center gap-2 border-l pl-3">
                <select
                  className="h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as any)}
                >
                  <option value="PDF">PDF формат</option>
                  <option value="HTML">HTML шаблон</option>
                  <option value="DOCX">DOCX файл</option>
                </select>

                <select
                  className="h-9 w-[130px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as TVisibilityType)
                  }
                >
                  <option value="PUBLIC">Публичный</option>
                  <option value="RESTRICTED">Ограниченный</option>
                </select>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
          </div>
        </div>
      </div>
      {error && (
        <div className="bg-destructive/10 text-destructive border-b border-destructive/20 p-2 text-center text-sm">
          {error}
        </div>
      )}

      {/* 3. Основная рабочая область - 3 колонки */}
      <div className="flex-1 overflow-hidden grid grid-cols-[280px_1fr_320px] divide-x">
        {/* Левая панель - Инструменты */}
        <div className="bg-card text-card-foreground flex flex-col overflow-y-auto w-[280px]">
          <div className="p-4 border-b font-semibold text-sm">Инструменты</div>
          <div className="flex-1 p-4">
            <ElementsPanel
              onAdd={(type) => {
                const el = createDefaultElement(type, generateId(), snapToGrid);
                const next = [...elements, el];
                setElements(next);
                saveToHistory(next);
                setSelectedId(el.id);
                if (type === "signature") {
                  handleOpenSignatureEditor(el.id);
                }
              }}
              onImageUpload={handleImageUpload}
              gridVisible={gridVisible}
              gridSnap={gridSnap}
              onToggleGrid={setGridVisible}
              onToggleSnap={setGridSnap}
              zoom={zoom}
              autoZoom={autoZoom}
              isManualZoom={isManualZoom}
              onZoomChange={(value: number, manual: boolean) =>
                setZoom(value, manual)
              }
            />
          </div>
        </div>

        {/* Центральная панель - Холст */}
        <div className="bg-muted/30 relative flex flex-col" ref={canvasContainerRef}>
          <div className="border-b bg-card p-2 flex justify-center sticky top-0 z-10">
              <CanvasToolbar
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={() => {
                  if (confirm("Очистить холст?")) {
                    setElements([]);
                    saveToHistory([]);
                    setSelectedId(null);
                  }
                }}
                onExportDocx={exportDocx}
                onExportHtml={exportHtml}
                onExportPdf={exportPdf}
                gridVisible={gridVisible}
                gridSnap={gridSnap}
                onToggleGrid={setGridVisible}
                onToggleSnap={setGridSnap}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
          </div>
          <div className="flex-1 overflow-auto p-8 flex items-start justify-center relative bg-muted/20">
              <Canvas
                ref={canvasRef}
                elements={elements}
                selectedId={selectedId}
                gridVisible={gridVisible}
                zoom={zoom}
                templateType={templateType}
                onSelect={setSelectedId}
                onElementMoveStart={(id, offsetX, offsetY) => {
                  startDrag(id, offsetX, offsetY);
                }}
                onElementResizeStart={(id, handle) => {
                  startResize(id, handle);
                }}
                onUpdateProp={updateProperties}
                onImageUpload={handleImageUpload}
                onEditSignature={handleOpenSignatureEditor}
                currentPage={currentPage}
              />
            </div>
        </div>

        {/* Правая панель - Свойства */}
        <div className="bg-card text-card-foreground flex flex-col overflow-y-auto w-[320px]">
          <div className="p-4 border-b font-semibold text-sm">Свойства элемента</div>
          <div className="flex-1 p-4">
            <PropertiesPanel
              selected={elements.find((el) => el.id === selectedId) || null}
              onUpdateEl={updateElement}
              onUpdateProps={updateProperties}
              onDelete={deleteElement}
              onMoveLayer={moveLayer}
              onEditSignature={handleOpenSignatureEditor}
            />
          </div>
        </div>
      </div>

      {/* Модальное окно ПОДПИСИ */}
      <Modal
        isOpen={isSigOpen}
        onClose={() => {
          setIsSigOpen(false);
          setSigEditId(null);
        }}
        title="Редактор подписи"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="bg-card text-card-foreground border rounded-md" style={{ padding: 8 }}>
            <canvas
              ref={sigCanvasRef}
              width={800}
              height={200}
              style={{
                width: "100%",
                height: 200,
                background: "#fff",
                touchAction: "none",
                cursor: "crosshair",
                borderRadius: 4,
                border: "1px dashed #ccc",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                sigDrawing.current = true;
                const c = sigCanvasRef.current;
                if (!c) return;
                const rect = c.getBoundingClientRect();
                const scaleX = c.width / rect.width || 1;
                const scaleY = c.height / rect.height || 1;

                const ctx = c.getContext("2d");
                if (!ctx) return;
                ctx.beginPath();
                ctx.moveTo(
                  (e.clientX - rect.left) * scaleX,
                  (e.clientY - rect.top) * scaleY,
                );
              }}
              onMouseMove={(e) => {
                if (!sigDrawing.current) return;
                const c = sigCanvasRef.current;
                if (!c) return;
                const rect = c.getBoundingClientRect();
                const scaleX = c.width / rect.width || 1;
                const scaleY = c.height / rect.height || 1;

                const ctx = c.getContext("2d");
                if (!ctx) return;
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.strokeStyle = "#000";
                ctx.lineTo(
                  (e.clientX - rect.left) * scaleX,
                  (e.clientY - rect.top) * scaleY,
                );
                ctx.stroke();
              }}
              onMouseUp={() => (sigDrawing.current = false)}
              onMouseLeave={() => (sigDrawing.current = false)}
            />
          </div>
          <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
            <Button
              variant="secondary"
              onClick={() => {
                const canvas = sigCanvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext("2d");
                  ctx?.clearRect(0, 0, canvas.width, canvas.height);
                  if (ctx) {
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                  }
                }
              }}
            >
              Очистить
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsSigOpen(false);
                setSigEditId(null);
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={saveSignatureFromModal}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
