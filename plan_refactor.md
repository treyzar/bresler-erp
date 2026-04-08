📋 Comprehensive Code Review: EDO Document Editor

    📊 Общая оценка

    Проанализирован редактор документов (MainEditor.tsx, Canvas.tsx, useDragResize.ts) — модуль EDO системы Bresler ERP. Это визуальный WYSIWYG-редактор для создания шаблонов документов с drag-and-drop, ресайзом, пагинацией и экспортом в PDF/DOCX/HTML.

    ---

    🔴 CRITICAL ISSUES (Must-Fix)

    1. Баг пагинации: элементы "телепортируются" между страницами

    Проблема:

     // MainEditor.tsx:671-677
     useEffect(() => {
       if (!selectedId) return;
       const selected = elements.find((el) => el.id === selectedId);
       if (!selected) return;
       const page = Math.max(0, Math.floor((selected.y || 0) / A4_HEIGHT));
       if (page !== currentPage) setCurrentPage(page);
     }, [selectedId, elements, currentPage]);

    Что происходит:
     - При перемещении элемента этот useEffect автоматически переключает currentPage на страницу, где находится элемент
     - Если элемент пересекает границу страницы, он может "прыгнуть" на другую страницу
     - Canvas.tsx отображает только элементы текущей страницы через visibleElements, поэтому пользователь теряет элемент из виду

    Почему это нарушает best practices:
     - Нарушен принцип единственной ответственности: хук следит одновременно за позицией элемента И за навигацией
     - Нет явной модели "какой элемент на какой странице"
     - Побочные эффекты вызывают каскадные обновления состояния

    Как исправить:

     // ✅ РЕШЕНИЕ: Разделить логику на две части

     // 1. Автоматическое переключение страниц ТОЛЬКО при выборе элемента
     useEffect(() => {
       if (!selectedId) return;
       
       const selected = elements.find((el) => el.id === selectedId);
       if (!selected) return;
       
       const elementPage = Math.floor(selected.y / A4_HEIGHT);
       
       // Переключаемся только если элемент точно НЕ на текущей странице
       // и мы не в процессе drag (isDragging)
       if (elementPage !== currentPage && !isDragging) {
         setCurrentPage(elementPage);
       }
     }, [selectedId]); // ⚠️ Убрали elements и currentPage из зависимостей

     // 2. НЕ удалять страницы, а показывать все страницы до последней
     const totalPages = React.useMemo(() => {
       if (elements.length === 0) return 1;
       
       const maxY = Math.max(
         A4_HEIGHT, // Минимум 1 страница
         ...elements.map((el) => el.y + el.height)
       );
       
       return Math.ceil(maxY / A4_HEIGHT);
     }, [elements]);

     // 3. Canvas должен рендерить ВСЕ страницы, а не только текущую
     // (см. пример ниже)

    Canvas.tsx — исправленный рендеринг страниц:

     // ✅ Вместо показа только текущей страницы,
     // рендерим все страницы как отдельные div-блоки
     const Canvas = forwardRef<HTMLDivElement, CanvasProps>(function CanvasComponent({
       elements,
       selectedId,
       // ...другие пропсы
       currentPage = 0,
     }, ref) {
       const totalPages = useMemo(() => {
         if (elements.length === 0) return 1;
         const maxY = Math.max(...elements.map(el => el.y + el.height));
         return Math.max(1, Math.ceil(maxY / A4_HEIGHT));
       }, [elements]);

       return (
         <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
           {Array.from({ length: totalPages }, (_, pageIndex) => (
             <Page 
               key={pageIndex}
               pageIndex={pageIndex}
               elements={elements}
               selectedId={selectedId}
               // ...другие пропсы
             />
           ))}
         </div>
       );
     });

     // Компонент одной страницы
     const Page = ({ pageIndex, elements, selectedId, ...props }) => {
       const pageTop = pageIndex * A4_HEIGHT;
       const pageBottom = pageTop + A4_HEIGHT;
       
       // Элементы, которые ХОТЯ БЫ ЧАСТИЧНО на этой странице
       const pageElements = useMemo(() => {
         return elements.filter(el => {
           const elTop = el.y;
           const elBottom = el.y + el.height;
           return elTop < pageBottom && elBottom > pageTop;
         });
       }, [elements, pageIndex]);

       return (
         <div style={{ position: 'relative', width: A4_WIDTH, height: A4_HEIGHT }}>
           {pageElements.map(el => {
             // ⚠️ ВАЖНО: visualY может быть отрицательным (элемент начинается на предыдущей странице)
             // или больше A4_HEIGHT (элемент продолжается на следующей странице)
             const visualY = el.y - pageTop;
             
             return (
               <ElementRenderer 
                 key={el.id}
                 element={{ ...el, y: visualY }}
                 style={{
                   // ✅ Элементы, выходящие за границы страницы, обрезаются
                   clipPath: `inset(0 0 0 0)`,
                   overflow: 'hidden'
                 }}
                 // ...остальные пропсы
               />
             );
           })}
         </div>
       );
     };

    Преимущества:
     - ✅ Элементы остаются на своих страницах
     - ✅ Пользователь видит все страницы и может прокручивать
     - ✅ Нет "телепортации" — страница переключается только при явном выборе элемента
     - ✅ Элементы, пересекающие границы страниц, корректно обрезаются

    ---

    2. Утечка памяти: не очищаются event listeners

    Проблема:

     // MainEditor.tsx:686-720
     useEffect(() => {
       const onMove = (e: MouseEvent) => { /* ... */ };
       const onUp = () => { /* ... */ };

       if (isDragging || isResizing) {
         window.addEventListener("mousemove", onMove);
         window.addEventListener("mouseup", onUp);
       }
       return () => {
         window.removeEventListener("mousemove", onMove);
         window.removeEventListener("mouseup", onUp); // ⚠️ Может не выполниться при unmount
       };
     }, [isDragging, isResizing, selectedId, zoom, gridSnap]);

    Почему это плохо:
     - При быстром mount/unmount компонента обработчики могут остаться
     - saveToHistory(elementsRef.current) в onUp вызывается асинхронно через setTimeout, что может привести к работе с устаревшими данными

    Как исправить:

     // ✅ РЕШЕНИЕ: Использовать useCallback для стабильных ссылок
     // и гарантированную очистку

     const onMove = useCallback((e: MouseEvent) => {
       if (!isDragging && !isResizing) return;
       const node = canvasRef.current;
       if (!node) return;

       const currentSnap = e.shiftKey ? (v: number) => v : snapToGrid;

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
     }, [isDragging, isResizing, zoom, selectedId, gridSnap]);

     const onUp = useCallback(() => {
       if (isDragging || isResizing) {
         saveToHistory(elementsRef.current);
       }
       stopDragResize();
     }, [isDragging, isResizing, stopDragResize]);

     useEffect(() => {
       if (isDragging || isResizing) {
         window.addEventListener("mousemove", onMove);
         window.addEventListener("mouseup", onUp);
         
         // ✅ Гарантированная очистка
         return () => {
           window.removeEventListener("mousemove", onMove);
           window.removeEventListener("mouseup", onUp);
         };
       }
     }, [isDragging, isResizing, onMove, onUp]);

    ---

    3. Типизация: использование `any` в критичных местах

    Проблема:

     // MainEditor.tsx:47
     const state = location.state as any; // ❌ Любая структура может быть

     // MainEditor.tsx:126
     updateProperties: (id: string, props: any) => { /* ... */ } // ❌ Нет валидации

     // Canvas.tsx:53, 67
     const props = el.properties as any; // ❌ Повторяется много раз

    Почему это плохо:
     - Нет type-safety
     - Легко передать неправильную структуру данных
     - Сложнее рефакторить

    Как исправить:

     // ✅ РЕШЕНИЕ: Создать строгие типы для навигации

     // types/editor.types.ts
     export interface INavigationState {
       prefillText?: string;
       importedElements?: IEditorElement[];
       importedMetadata?: Record<string, any>;
       title?: string;
       templateId?: number;
       letterId?: number;
       letterData?: Record<string, string>;
     }

     // MainEditor.tsx
     const state = location.state as INavigationState | null;
     const prefill = state?.prefillText;

     // ✅ Строгая типизация updateProperties
     const updateProperties = useCallback(
       (id: string, props: Partial<TElementProperties>) => {
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

    ---

    🟠 HIGH PRIORITY

    4. Слишком большой компонент (1025 строк)

    Проблема:
    MainEditor.tsx — 1025 строк, содержит:
     - Управление состоянием (15+ useState)
     - Загрузку данных (useEffect с 4 ветками логики)
     - Экспорт (DOCX, HTML, PDF)
     - Сохранение на сервер
     - Обработку подписи
     - Drag-and-drop
     - Историю изменений

    Почему это нарушает best practices:
     - ❌ Нарушение Single Responsibility Principle
     - ❌ Сложность тестирования
     - ❌ Трудно поддерживать

    Как рефакторить:

     src/features/edo/
     ├── components/
     │   └── editor/
     │       ├── Editor.tsx              (основной контейнер, ~100 строк)
     │       ├── EditorHeader.tsx        (метаданные, сохранение)
     │       ├── EditorToolbar.tsx       (экспорт, undo/redo)
     │       ├── ElementsPanel.tsx
     │       ├── PropertiesPanel.tsx
     │       └── Canvas/
     │           ├── Canvas.tsx
     │           ├── Page.tsx            (новая: одна страница)
     │           └── ElementRenderer.tsx
     ├── hooks/
     │   ├── useEditor.ts                (новая: логика редактора)
     │   ├── useDragResize.ts
     │   ├── useKeyboard.ts
     │   └── useAutoZoom.ts
     ├── services/
     │   ├── exportService.ts            (новая: DOCX/HTML/PDF)
     │   └── templateService.ts          (новая: загрузка/сохранение)
     └── stores/
         └── editorStore.ts              (новая: Zustand вместо useState)

    Пример кастомного хука:

     // hooks/useEditor.ts
     interface UseEditorOptions {
       initialElements?: IEditorElement[];
       onSave?: (elements: IEditorElement[]) => Promise<void>;
     }

     export function useEditor(options: UseEditorOptions = {}) {
       const [elements, setElements] = useState(options.initialElements || []);
       const { saveToHistory, undo, redo, canUndo, canRedo } = useHistory(elements);

       const addElement = useCallback((type: TElementType) => {
         const newEl = createDefaultElement(type, generateId(), snapToGrid);
         setElements(prev => {
           const next = [...prev, newEl];
           saveToHistory(next);
           return next;
         });
         return newEl.id;
       }, [saveToHistory]);

       const deleteElement = useCallback((id: string) => {
         setElements(prev => {
           const next = prev.filter(el => el.id !== id);
           saveToHistory(next);
           return next;
         });
       }, [saveToHistory]);

       // ...другие методы

       return {
         elements,
         addElement,
         deleteElement,
         undo,
         redo,
         canUndo,
         canRedo,
       };
     }

    ---

    5. Неэффективный useMemo/useCallback: избыточные зависимости

    Проблема:

     // MainEditor.tsx
     const updateElement = useCallback(
       (id: string, upd: Partial<IEditorElement>) => {
         const next = elements.map((el) =>
           el.id === id ? { ...el, ...upd } : el,
         );
         setElements(next);
         saveToHistory(next);
       },
       [elements, saveToHistory], // ❌ Пересоздается при каждом изменении elements
     );

    Почему это плохо:
     - useCallback с elements в зависимости пересоздается при каждом рендере
     - Это сводит на нет оптимизацию

    Как исправить:

     // ✅ РЕШЕНИЕ 1: Использовать functional updates
     const updateElement = useCallback(
       (id: string, upd: Partial<IEditorElement>) => {
         setElements(prev => {
           const next = prev.map((el) =>
             el.id === id ? { ...el, ...upd } : el,
           );
           saveToHistory(next);
           return next;
         });
       },
       [saveToHistory], // ✅ Стабильная ссылка
     );

     // ✅ РЕШЕНИЕ 2: Для saveToHistory использовать ref
     const saveToHistoryRef = useRef(saveToHistory);
     useEffect(() => {
       saveToHistoryRef.current = saveToHistory;
     }, [saveToHistory]);

     const updateElement = useCallback((id: string, upd: Partial<IEditorElement>) => {
       setElements(prev => {
         const next = prev.map((el) => el.id === id ? { ...el, ...upd } : el);
         saveToHistoryRef.current(next); // ✅ Нет в зависимостях
         return next;
       });
     }, []); // ✅ Пустые зависимости!

    ---

    6. Race condition при загрузке данных

    Проблема:

     // MainEditor.tsx:406-524
     useEffect(() => {
       /* 1. Импорт из парсера */
       if (importedElements && importedElements.length > 0) {
         setElements(sortedAdjustedElements);
         saveToHistory(sortedAdjustedElements);
         return;
       }

       /* 2. Редактирование шаблона */
       if (editingTemplateId) {
         const fetchTemplate = async () => {
           // ...асинхронная загрузка
           setElements(nextElements);
           saveToHistory(nextElements);
         };
         fetchTemplate();
         return; // ⚠️ Не ждет завершения async
       }

       /* 3. Prefill */
       if (prefill) { /* ... */ return; }
       
       /* 4. LocalStorage */
       // ...
     }, []); // ⚠️ Выполняется один раз, но async операции могут завершиться в любом порядке

    Почему это плохо:
     - Если несколько условий истинны, могут конфликтовать обновления состояния
     - Нет cleanup для async операций

    Как исправить:

     // ✅ РЕШЕНИЕ: Приоритизация и cleanup
     useEffect(() => {
       let cancelled = false;

       async function loadData() {
         // Приоритет 1: Импорт
         if (importedElements?.length) {
           const adjusted = adjustImportedElements(importedElements, importedMetadata);
           if (!cancelled) {
             setElements(adjusted);
             saveToHistory(adjusted);
           }
           return;
         }

         // Приоритет 2: Загрузка шаблона
         if (editingTemplateId) {
           try {
             const tpl = await templatesApi.get(editingTemplateId);
             if (!cancelled) {
               const elements = parseTemplate(tpl, letterData);
               setElements(elements);
               saveToHistory(elements);
             }
           } catch (e) {
             if (!cancelled) setError("Ошибка загрузки: " + e);
           }
           return;
         }

         // Приоритет 3: Prefill
         if (prefill) {
           const elements = createPrefillElements(prefill);
           if (!cancelled) {
             setElements(elements);
             saveToHistory(elements);
           }
           return;
         }

         // Приоритет 4: Draft
         const draft = localStorage.getItem(LOCALSTORAGE_KEY);
         if (draft) {
           try {
             const { elements } = JSON.parse(draft);
             if (!cancelled && elements?.length) {
               setElements(elements);
               saveToHistory(elements);
             }
           } catch {}
         }
       }

       loadData();

       return () => {
         cancelled = true; // ✅ Cleanup
       };
     }, []);

    ---

    🟡 MEDIUM PRIORITY

    7. Магические числа в коде

    Проблема:

     // MainEditor.tsx:718
     return Math.max(1, Math.ceil(maxY / 1123)); // 1123 - что это?

     // MainEditor.tsx:478
     el.width = 700; // Почему 700?
     el.x = snapToGrid(47); // Почему 47?

     // Canvas.tsx:42, 43
     const PAGE_HEIGHT = 1123; // Дублируется
     const PAGE_WIDTH = 794;

    Как исправить:

     // ✅ Вынести в константы с понятными именами
     // editor.constants.ts
     export const A4_WIDTH = 794;
     export const A4_HEIGHT = 1123;
     export const DEFAULT_TEXT_WIDTH = 700;
     export const DEFAULT_TEXT_X = (A4_WIDTH - DEFAULT_TEXT_WIDTH) / 2; // 47
     export const TABLE_ROW_HEIGHT = 40;
     export const MIN_ELEMENT_WIDTH = 20;
     export const MIN_ELEMENT_HEIGHT = 20;
     export const ELEMENT_PADDING = 40;

     // Использование
     el.width = DEFAULT_TEXT_WIDTH;
     el.x = snapToGrid(DEFAULT_TEXT_X);

    ---

    8. Мутация состояния напрямую

    Проблема:

     // MainEditor.tsx
     const updateElementPosition = useCallback(
       (id: string, upd: Partial<IEditorElement>) => {
         setElements((prev) =>
           prev.map((el) => (el.id === id ? { ...el, ...upd } : el)),
         );
       },
       [],
     );

     // useDragResize.ts:83
     updateElement(selectedId, { x: nx, y: ny });

    Почему это может быть проблемой:
     - updateElementPosition не вызывает saveToHistory, что приводит к рассинхронизации истории
     - При undo/redo позиция может сброситься

    Как исправить:

     // ✅ РЕШЕНИЕ: Разделить "временные" и "финальные" обновления

     interface UseEditorState {
       elements: IEditorElement[];
       tempElements: IEditorElement[]; // Для drag (без сохранения в историю)
       isDragging: boolean;
     }

     // При drag обновляем tempElements
     const handleMouseMove = (e: MouseEvent) => {
       if (isDragging) {
         setTempElements(prev => 
           prev.map(el => el.id === selectedId ? { ...el, x: nx, y: ny } : el)
         );
       }
     };

     // При mouse up сохраняем в историю
     const handleMouseUp = () => {
       setElements(tempElements);
       saveToHistory(tempElements);
       setTempElements([]);
     };

    ---

    9. Отсутствие валидации данных

    Проблема:

     // MainEditor.tsx
     const handleSave = async (e: React.FormEvent) => {
       e.preventDefault();
       if (!title.trim()) return setError("Введите название");
       if (!elements.length) return setError("Добавьте элементы");
       // ❌ Нет валидации структуры elements
       // ❌ Нет проверки на NaN в координатах
       // ❌ Нет проверки на отрицательные размеры

    Как исправить:

     // ✅ Создать валидатор
     function validateElements(elements: IEditorElement[]): string[] {
       const errors: string[] = [];
       
       elements.forEach((el, idx) => {
         if (isNaN(el.x) || isNaN(el.y)) {
           errors.push(`Элемент #${idx + 1}: некорректные координаты`);
         }
         if (el.width <= 0 || el.height <= 0) {
           errors.push(`Элемент #${idx + 1}: отрицательные размеры`);
         }
         if (el.x < 0 || el.y < 0) {
           errors.push(`Элемент #${idx + 1}: отрицательная позиция`);
         }
         if (el.type === 'text' && !(el.properties as ITextProperties).content) {
           errors.push(`Элемент #${idx + 1}: пустой текст`);
         }
       });
       
       return errors;
     }

     // Использование
     const handleSave = async (e: React.FormEvent) => {
       e.preventDefault();
       
       const validationErrors = validateElements(elements);
       if (validationErrors.length > 0) {
         setError(`Валидация не пройдена: ${validationErrors.join(', ')}`);
         return;
       }
       
       // ...продолжить сохранение
     };

    ---

    10. Недостаточное тестирование

    Проблема:
     - Найдено только 2 тестовых файла для утилит миграции
     - Нет тестов для MainEditor, Canvas, useDragResize
     - Нет тестов для критичной логики пагинации

    Рекомендация:

     // __tests__/Canvas.test.tsx
     describe('Canvas Pagination', () => {
       it('should render all pages when elements span multiple pages', () => {
         const elements = [
           { id: '1', y: 0, height: 500 },    // Страница 1
           { id: '2', y: 1123, height: 500 }, // Страница 2
           { id: '3', y: 2246, height: 500 }, // Страница 3
         ];
         
         render(<Canvas elements={elements} currentPage={0} />);
         
         expect(screen.getAllByRole('page')).toHaveLength(3);
       });

       it('should not teleport element to different page during drag', () => {
         const elements = [{ id: 'el1', y: 100, height: 200 }];
         const { rerender } = render(
           <Canvas elements={elements} currentPage={0} isDragging={false} />
         );
         
         // Имитируем перемещение на следующую страницу
         rerender(
           <Canvas elements={[{ id: 'el1', y: 1200, height: 200 }]} currentPage={0} isDragging={true} />
         );
         
         // Страница НЕ должна переключиться во время drag
         expect(screen.getByTestId('page-0')).toBeInTheDocument();
       });

       it('should clip elements that cross page boundaries', () => {
         const elements = [{ 
           id: 'el1', 
           y: 1000, // Начинается на стр. 1
           height: 300 // Заканчивается на стр. 2 (1000 + 300 = 1300 > 1123)
         }];
         
         render(<Canvas elements={elements} currentPage={0} />);
         
         const element = screen.getByTestId('element-el1');
         expect(element).toHaveStyle({ overflow: 'hidden' });
       });
     });

    ---

    🟢 LOW PRIORITY

    11. Консистентность именования

    Проблема:

     // Смешение стилей именования
     const updateElement         // ✅ camelCase
     const handleUndo            // ✅ camelCase  
     const export_docx           // ❌ snake_case (если есть)
     const LOCALSTORAGE_KEY      // ✅ CONSTANT_CASE

    Рекомендация:
    Следовать единому стилю (camelCase для функций/переменных, CONSTANT_CASE для констант).

    ---

    12. Комментарии на русском и английском

    Проблема:

     /* ---------- состояние ---------- */           // Русский
     /* API и константы */                            // Русский
     /* ---------- helpers ---------- */               // Английский
     /* ---------- drag/ resize ---------- */          // Английский

    Рекомендация:
    Выбрать один язык для комментариев (рекомендую английский для международных команд).

    ---

    13. Неиспользуемые импорты в проекте

    Из lint-отчёта видно множество неиспользуемых импортов:
     - BaseEntity в devicesApi.ts
     - toast, Button в CatalogPage.tsx
     - Множество в DeviceDetailPage.tsx

    Рекомендация:

     # Автоматически удалить неиспользуемые импорты
     npx eslint --fix src/

    ---

    📊 Сводная таблица


    ┌────┬─────────────┬─────────────────┬─────────────────────────────────────────┬─────────────────┐
    │ #  │ Приоритет   │ Категория       │ Описание                                │ Сложность фикса │
    ├────┼─────────────┼─────────────────┼─────────────────────────────────────────┼─────────────────┤
    │ 1  │ 🔴 Critical │ Bug             │ Телепортация элементов между страницами │ Medium          │
    │ 2  │ 🔴 Critical │ Memory Leak     │ Event listeners не очищаются            │ Easy            │
    │ 3  │ 🔴 Critical │ Type Safety     │ Использование any                       │ Medium          │
    │ 4  │ 🟠 High     │ Architecture    │ Компонент 1025 строк                    │ Hard            │
    │ 5  │ 🟠 High     │ Performance     │ Избыточные зависимости в hooks          │ Easy            │
    │ 6  │ 🟠 High     │ Bug             │ Race condition при загрузке             │ Easy            │
    │ 7  │ 🟡 Medium   │ Maintainability │ Магические числа                        │ Easy            │
    │ 8  │ 🟡 Medium   │ Data Integrity  │ Мутация состояния напрямую              │ Medium          │
    │ 9  │ 🟡 Medium   │ Reliability     │ Отсутствие валидации                    │ Easy            │
    │ 10 │ 🟡 Medium   │ Quality         │ Нет тестов                              │ Hard            │
    │ 11 │ 🟢 Low      │ Style           │ Консистентность именования              │ Easy            │
    │ 12 │ 🟢 Low      │ Style           │ Язык комментариев                       │ Easy            │
    │ 13 │ 🟢 Low      │ Cleanup         │ Неиспользуемые импорты                  │ Easy            │
    └────┴─────────────┴─────────────────┴─────────────────────────────────────────┴─────────────────┘

    ---

    🎯 Рекомендуемый план действий

    Фаза 1: Критические баги (1-2 дня)
     1. Исправить логику пагинации (Issue #1)
     2. Добавить cleanup для event listeners (Issue #2)
     3. Убрать any из критичных мест (Issue #3)

    Фаза 2: Стабильность (2-3 дня)
     4. Исправить race conditions (Issue #6)
     5. Добавить валидацию элементов (Issue #9)
     6. Оптимизировать useCallback зависимости (Issue #5)

    Фаза 3: Рефакторинг (1-2 недели)
     7. Выделить кастомные хуки (Issue #4)
     8. Создать сервисы для экспорта
     9. Добавить тесты для критичной логики (Issue #10)

    Фаза 4: Полировка (постоянно)
     10. Убрать магические числа (Issue #7)
     11. Консистентность кода (Issues #11-13)