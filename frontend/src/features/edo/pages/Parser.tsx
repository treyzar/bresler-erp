// src/components/ParserPage.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { parserApi } from "../api/client";
import type { ParsedDocument } from "../api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUp, X, FileText, Loader2 } from "lucide-react";

interface Props {
  onResultChange?: (doc: ParsedDocument | null) => void;
}

const ParserPage: React.FC<Props> = ({ onResultChange }) => {
  const navigate = useNavigate();

  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    onResultChange?.(doc);
  }, [doc, onResultChange]);

  const humanSize = (b: number) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(1)} КБ`
      : `${(b / (1024 * 1024)).toFixed(1)} МБ`;

  const reset = () => {
    setDoc(null);
    setErr(null);
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "html"].includes(ext!)) {
      setErr("Разрешены только PDF, DOCX и HTML");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErr("Максимальный размер 20 МБ");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await parserApi.parse(file);
      setDoc(res);
      const elements = (res as any).editor_elements;

      setTimeout(() => {
        navigate("/edo/builder", {
          state: {
            importedElements: elements,
            importedMetadata: (res as any).editor_metadata,
            prefillText: res.extracted_text,
            title: res.original_filename,
          },
        });
      }, 500);
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Не удалось распарсить документ";
      setErr(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onDragOver: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onDrop: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-primary" /> 
          Извлечь текст из документа
        </h1>
        <p className="text-muted-foreground mt-3">
          Автоматическое распознавание таблиц и текста. Поддерживаются PDF, DOCX и HTML (до 20 МБ).
        </p>
      </div>

      {err && (
        <div className="bg-destructive/10 text-destructive border-l-4 border-destructive p-4 flex justify-between items-center rounded-md mb-8">
          <span className="font-medium text-sm">{err}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/20" onClick={() => setErr(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!doc ? (
        <label
          className={`
            relative flex flex-col items-center justify-center w-full min-h-[320px] 
            border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
            ${dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/30 bg-muted/10 hover:bg-muted/30 hover:border-primary/50'}
          `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          htmlFor="file-input"
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.docx,.html"
            className="hidden"
            onClick={(e) => {
              (e.target as HTMLInputElement).value = "";
            }}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium text-lg">Обрабатываем документ...</p>
                <p className="text-sm text-muted-foreground mt-1">ИИ распознает структуру и таблицы</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 text-center p-6">
              <div className={`p-4 rounded-full bg-background shadow-sm transition-transform duration-300 ${dragOver ? 'scale-110 shadow-md' : ''}`}>
                <FileUp className={`h-10 w-10 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium text-xl mb-1 text-foreground">
                  Перетащите файл сюда
                </p>
                <p className="text-sm text-muted-foreground">
                  или <span className="text-primary hover:underline cursor-pointer">нажмите для выбора файла</span> на компьютере
                </p>
              </div>
            </div>
          )}
        </label>
      ) : (
         <Card className="border-primary/20 shadow-md animate-in zoom-in-95 duration-300">
           <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-xl text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {doc.original_filename}
                </h3>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="uppercase">{doc.file_type}</Badge>
                  <Badge variant="outline">{humanSize(doc.file_size)}</Badge>
                </div>
              </div>
              <Button variant="outline" onClick={reset}>
                <X className="mr-2 h-4 w-4" /> Отменить выбор
              </Button>
            </div>
            
            <div className="mt-8 pt-8 border-t flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="p-3 bg-primary/10 rounded-full animate-pulse">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <p className="font-medium text-lg">Документ успешно проанализирован</p>
                <p className="text-sm text-muted-foreground mt-1">Перенаправляем в редактор шаблонов...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParserPage;
