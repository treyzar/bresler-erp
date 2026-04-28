// src/pages/RenderTemplate.tsx

import { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router";
import { templatesApi } from "../api/client";
import type { Template } from "../api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, FileText, Download, CheckCircle, Loader2, AlertCircle, Eye, Trash2 } from "lucide-react";
import { replacePlaceholdersInString } from "../utils/help/replacePlaceholders";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

export default function RenderTemplate() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;
  
  const templateIdFromState = location.state?.templateId;
  const actualId = id || templateIdFromState;

  const [template, setTemplate] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (actualId) {
      loadTemplate(actualId);
    } else {
      setError("Template ID is missing");
      setLoading(false);
    }
  }, [actualId]);

  const loadTemplate = async (templateId: string | number) => {
    if (!templateId) return;
    
    try {
      const data = await templatesApi.get(Number(templateId));
      setTemplate(data);
      const initialValues: Record<string, string> = {};
      
      // Предзаполнение данными из письма (если есть в state)
      const letterData = location.state?.letterData || {};
      
      data.placeholders.forEach((p) => {
        initialValues[p] = letterData[p] || "";
      });
      setValues(initialValues);
    } catch (err) {
      setError("Failed to load template");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    
    if (template.owner_id !== currentUserId) {
      toast.error("Удаление разрешено только владельцу шаблона");
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите удалить шаблон "${template.title}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await templatesApi.delete(template.id);
      toast.success("Шаблон успешно удален");
      navigate("/edo/templates");
    } catch (err) {
      toast.error("Ошибка при удалении шаблона");
      console.error(err);
      setIsDeleting(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  /* Скачивание исходного файла в разных форматах */
  const handleDownload = async (format: "pdf" | "html" | "docx" | "json") => {
    if (!template) return;
    setDownloading(format);
    setError(null);

    try {
      const blob = await templatesApi.downloadSource(template.id, format);

      // Проверяем, не вернулась ли ошибка в виде JSON
      if (blob.type === "application/json") {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Download failed");
        } catch (_parseErr) {
          throw new Error("Download failed");
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.title}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed";
      setError(message);

      // Специальное сообщение для DOCX
      if (format === "docx" && message.includes("not available")) {
        setError(
          "DOCX файл недоступен. Этот шаблон создан в веб-редакторе. Скачайте PDF или HTML.",
        );
      }
    } finally {
      setDownloading(null);
    }
  };

  /* Рендер с заполнением полей */
  const handleRenderData = async () => {
    if (!template) return;
    setRendering(true);
    setError(null);

    try {
      const blob = await templatesApi.render(template.id, { values });

      // Проверяем на ошибку
      if (blob.type === "application/json") {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Render failed");
        } catch (_parseErr) {
          throw new Error("Render failed");
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Определяем расширение по типу
      const extension =
        template.template_type === "DOCX" && template.docx_file
          ? "docx"
          : "pdf";
      a.download = `${template.title}_filled.${extension}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка генерации документа";
      setError(message);
    } finally {
      setRendering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Загрузка шаблона...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-xl font-semibold">Шаблон не найден</h3>
        <Button variant="outline" asChild>
          <Link to="/edo/templates">Вернуться на главную</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3 hidden sm:inline-flex text-muted-foreground hover:text-foreground">
          <Link to="/edo/templates">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              {template.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              {template.description ||
                "Скачайте шаблон или заполните поля для генерации документа"}
            </p>
          </div>
          {template.owner_id === currentUserId && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="sm:self-start shadow-sm"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Удалить шаблон
            </Button>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Badge variant={template.template_type === "PDF" ? "default" : "secondary"} className="uppercase">
            {template.template_type}
          </Badge>
          <Badge variant="outline">{template.visibility === "PUBLIC" ? "Публичный" : "Приватный"}</Badge>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 text-destructive border-l-4 border-destructive p-4 flex items-start gap-3 rounded-md">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="font-medium text-sm">{error}</div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Левая колонка: Скачивание */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
               <Download className="h-5 w-5 text-primary" />
               Скачать шаблон
            </CardTitle>
            <CardDescription>
               Скачайте пустой шаблон без заполнения полей
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* PDF - всегда доступен */}
            <Button
              variant="outline"
              className="w-full justify-start font-normal h-11"
              onClick={() => handleDownload("pdf")}
              disabled={!!downloading}
            >
              {downloading === "pdf" ? (
                <Loader2 className="mr-3 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="mr-3 text-red-500 font-bold text-lg leading-none">PDF</span>
              )}
              Скачать PDF
            </Button>

            {/* HTML - всегда доступен */}
            <Button
              variant="outline"
              className="w-full justify-start font-normal h-11"
              onClick={() => handleDownload("html")}
              disabled={!!downloading}
            >
              {downloading === "html" ? (
                 <Loader2 className="mr-3 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                 <span className="mr-3 text-orange-500 font-bold text-lg leading-none">HTML</span>
              )}
              Скачать HTML
            </Button>

            {/* JSON - всегда доступен */}
            <Button
              variant="outline"
              className="w-full justify-start font-normal h-11"
              onClick={() => handleDownload("json")}
              disabled={!!downloading}
            >
              {downloading === "json" ? (
                 <Loader2 className="mr-3 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                 <span className="mr-3 text-yellow-500 font-bold text-lg leading-none">{`{}`}</span>
              )}
              Скачать JSON-структуру
            </Button>

            {/* DOCX - только если есть файл */}
            {template.docx_file ? (
              <Button
                variant="outline"
                className="w-full justify-start font-normal h-11"
                onClick={() => handleDownload("docx")}
                disabled={!!downloading}
              >
                {downloading === "docx" ? (
                   <Loader2 className="mr-3 h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                   <span className="mr-3 text-blue-500 font-bold text-lg leading-none">DOCX</span>
                )}
                Скачать DOCX
              </Button>
             ) : template.template_type === "DOCX" ? (
               <div className="text-xs text-muted-foreground bg-muted p-3 flex rounded-md">
                 DOCX исходник недоступен, так как шаблон был создан в веб-редакторе. Используйте экспорт в PDF или HTML.
               </div>
             ) : null}
          </CardContent>
        </Card>

        {/* Правая колонка: Заполнение и рендер */}
        <Card className="border-primary/20 shadow-md bg-card/50">
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-xl">
               <FileText className="h-5 w-5 text-primary" />
               Заполнить и скачать
             </CardTitle>
             {template.placeholders.length > 0 ? (
               <CardDescription>
                 Заполните поля, чтобы сгенерировать готовый документ
               </CardDescription>
             ) : (
                <CardDescription>
                  В этом шаблоне нет текстовых полей для автозаполнения.
                </CardDescription>
             )}
           </CardHeader>

          <CardContent className="space-y-6">
            {template.placeholders.length > 0 && (
              <div className="space-y-4">
                {template.placeholders.map((placeholder) => (
                  <div key={placeholder} className="space-y-2">
                    <Label htmlFor={placeholder} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {placeholder.replace(/_/g, " ")}
                    </Label>
                    <Input
                      id={placeholder}
                      value={values[placeholder] || ""}
                      onChange={(e) =>
                        handleValueChange(placeholder, e.target.value)
                      }
                      placeholder={`Введите значение...`}
                      className="bg-background"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleRenderData}
              disabled={rendering}
              className="w-full h-12 text-base"
              size="lg"
            >
              {rendering ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Генерация документа...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Сгенерировать {template.docx_file ? "DOCX" : "PDF"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview секция (опционально) */}
      {template.html_content && (
        <Card className="border-border shadow-sm overflow-hidden">
           <CardHeader className="bg-muted/30 border-b">
             <CardTitle className="flex items-center gap-2 text-lg">
               <Eye className="h-5 w-5 text-muted-foreground" />
               Предпросмотр структуры
             </CardTitle>
           </CardHeader>
           <div className="p-0 bg-white dark:bg-zinc-100 dark:text-zinc-900 border-t border-border/50 max-h-[600px] overflow-auto">
             {/* Note: Content here should ideally be isolated to avoid inheriting dark mode styles. */}
             <div className="origin-top-left p-8 sm:p-12 min-w-[700px] max-w-[800px] mx-auto prose prose-sm sm:prose-base dark:prose-invert"
                  dangerouslySetInnerHTML={{ 
                    __html: replacePlaceholdersInString(template.html_content, values) 
                  }}
             />
           </div>
        </Card>
      )}
    </div>
  );
}
