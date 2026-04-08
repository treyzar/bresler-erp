import React from "react";
import {
  BookOpen,
  Keyboard,
  PlusCircle,
  MousePointer,
  TableIcon,
  Download,
  Copy,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type HelpSectionId = "hotkeys" | "elements" | "work" | "tables" | "export" | "copy";

type HelpItem = {
  title?: string;
  description: string;
  shortcut?: string;
};

type HelpSection = {
  id: HelpSectionId;
  label: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: HelpItem[];
};

const sections: HelpSection[] = [
  {
    id: "hotkeys",
    label: "Горячие клавиши",
    icon: <Keyboard className="h-4 w-4" />,
    title: "Быстрые действия",
    subtitle: "Основные сочетания для работы без мыши.",
    items: [
      { shortcut: "Ctrl+Z", description: "Отменить последнее действие" },
      { shortcut: "Ctrl+Y", description: "Повторить отмененное действие" },
      { shortcut: "Delete", description: "Удалить выбранный элемент" },
      { shortcut: "Shift", description: "Точное перемещение без изменения привязки" },
      { shortcut: "Ctrl+C", description: "Скопировать выбранный элемент" },
      { shortcut: "Ctrl+V", description: "Вставить скопированный элемент" },
    ],
  },
  {
    id: "elements",
    label: "Элементы",
    icon: <PlusCircle className="h-4 w-4" />,
    title: "Библиотека блоков",
    subtitle: "Какие элементы доступны в конструкторе.",
    items: [
      { title: "Текст", description: "Блок с форматированием, абзацами и стилями" },
      { title: "Изображение", description: "Вставка по URL или загрузка файла" },
      { title: "Таблица", description: "Редактируемая табличная структура" },
      { title: "Подпись", description: "Блок для рукописной подписи" },
      { title: "Разделитель", description: "Линия для визуального разделения секций" },
    ],
  },
  {
    id: "work",
    label: "Работа с элементами",
    icon: <MousePointer className="h-4 w-4" />,
    title: "Редактирование на холсте",
    subtitle: "Управление положением, размером и слоями.",
    items: [
      { title: "Выбор", description: "Клик по элементу открывает панель свойств" },
      { title: "Перемещение", description: "Тяните элемент мышью по холсту" },
      { title: "Изменение размера", description: "Используйте маркеры по углам блока" },
      { title: "Слои", description: "Команды " + '"На передний/задний план"' + " меняют порядок" },
      { title: "Удаление", description: "Кнопка в свойствах или клавиша Delete" },
    ],
  },
  {
    id: "tables",
    label: "Таблицы",
    icon: <TableIcon className="h-4 w-4" />,
    title: "Работа с таблицами",
    subtitle: "Редактирование содержимого и структуры таблиц.",
    items: [
      { title: "Ячейки", description: "Редактируйте текст прямо в таблице" },
      { title: "Строки и столбцы", description: "Добавляйте или удаляйте через контекстное меню" },
      { title: "Границы", description: "Настраивайте цвет и толщину в панели свойств" },
      { title: "Ширина колонок", description: "Меняйте перетаскиванием границ колонок" },
    ],
  },
  {
    id: "export",
    label: "Экспорт",
    icon: <Download className="h-4 w-4" />,
    title: "Сохранение и выгрузка",
    subtitle: "Доступные форматы документа и черновики.",
    items: [
      { title: "Сохранить шаблон", description: "Сохраняет структуру на сервере" },
      { title: "DOCX", description: "Экспорт документа в формат Word" },
      { title: "HTML", description: "Экспорт в веб-представление" },
      { title: "PDF", description: "Генерация печатной версии" },
      { title: "Автосохранение", description: "Черновик обновляется локально раз в 30 секунд" },
    ],
  },
  {
    id: "copy",
    label: "Копирование",
    icon: <Copy className="h-4 w-4" />,
    title: "Дублирование блоков",
    subtitle: "Как быстро копировать элементы внутри шаблона.",
    items: [
      { shortcut: "Ctrl+C", description: "Копирует выделенный элемент" },
      { shortcut: "Ctrl+V", description: "Вставляет копию на холст" },
      { title: "Через UI", description: "Можно скопировать элемент кнопкой в панели свойств" },
    ],
  },
];

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl border p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b bg-gradient-to-r from-muted/50 to-background px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md border bg-background p-2 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Руководство
                </Badge>
              </div>
              <DialogTitle className="text-xl font-semibold">Справка конструктора шаблонов</DialogTitle>
              <DialogDescription>
                Навигация по возможностям редактора, работе с элементами и экспорту.
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </DialogHeader>

        <Tabs
          defaultValue="hotkeys"
          className="h-[calc(90vh-140px)] min-h-[420px] gap-0 md:grid md:grid-cols-[260px_minmax(0,1fr)]"
          orientation="vertical"
        >
          <div className="border-r bg-muted/20 p-3">
            <TabsList className="h-full w-full flex-col items-stretch bg-transparent p-0" variant="line">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="h-10 w-full justify-start rounded-md px-3 text-sm"
                >
                  {section.icon}
                  <span>{section.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {sections.map((section) => (
            <TabsContent key={section.id} value={section.id} className="h-full p-0">
              <ScrollArea className="h-full">
                <div className="space-y-4 p-5">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                  </div>
                  <Separator />
                  <div className="grid gap-3">
                    {section.items.map((item, index) => (
                      <Card key={`${section.id}-${index}`} className="py-0">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {index + 1}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {item.title && <p className="text-sm font-semibold">{item.title}</p>}
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              {item.shortcut && (
                                <Badge variant="secondary" className="mt-1 font-mono text-[11px]">
                                  {item.shortcut}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;
