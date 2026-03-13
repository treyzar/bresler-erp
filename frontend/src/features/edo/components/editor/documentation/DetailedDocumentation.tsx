import React from "react";
import {
  Keyboard,
  PlusCircle,
  MousePointer,
  TableIcon,
  Download,
  Copy,
} from "lucide-react";

type DocSection =
  | "hotkeys"
  | "elements"
  | "work"
  | "tables"
  | "export"
  | "copy";

const DetailedDocumentation: React.FC<{ section: DocSection }> = ({
  section,
}) => {
  switch (section) {
    case "hotkeys":
      return (
        <div className="doc-content">
          <h4 className="doc-heading">
            <Keyboard size={18} />
            Горячие клавиши
          </h4>
          <ul className="doc-list">
            <li className="doc-item">
              <kbd className="kbd">Ctrl+Z</kbd>
              <span>Отменить последнее действие</span>
            </li>
            <li className="doc-item">
              <kbd className="kbd">Ctrl+Y</kbd>
              <span>Повторить отмененное действие</span>
            </li>
            <li className="doc-item">
              <kbd className="kbd">Delete</kbd>
              <span>Удалить выбранный элемент</span>
            </li>
            <li className="doc-item">
              <kbd className="kbd">Shift</kbd>
              <span>Временно включить привязку к сетке (удерживайте)</span>
            </li>
            <li className="doc-item">
              <kbd className="kbd">Ctrl+C</kbd>
              <span>Скопировать выбранный элемент в буфер обмена</span>
            </li>
            <li className="doc-item">
              <kbd className="kbd">Ctrl+V</kbd>
              <span>Вставить скопированный элемент на холст</span>
            </li>
          </ul>
        </div>
      );
    case "elements":
      return (
        <div className="doc-content">
          <h4 className="doc-heading">
            <PlusCircle size={18} />
            Добавление элементов
          </h4>
          <ul className="doc-list">
            <li className="doc-item">
              <strong>Текст:</strong> Добавляет текстовый блок с возможностью
              форматирования
            </li>
            <li className="doc-item">
              <strong>Изображение:</strong> Добавляет блок для изображения (URL
              или загрузка файла)
            </li>
            <li className="doc-item">
              <strong>Таблица:</strong> Создает таблицу с редактируемыми
              ячейками
            </li>
            <li className="doc-item">
              <strong>Дата:</strong> Поле ввода даты с календарем
            </li>
            <li className="doc-item">
              <strong>Подпись:</strong> Линия для подписи с текстом
            </li>
            <li className="doc-item">
              <strong>Разделитель:</strong> Горизонтальная линия для разделения
              контента
            </li>
          </ul>
        </div>
      );
    case "work":
      return (
        <div className="doc-content">
          <h4 className="doc-heading">
            <MousePointer size={18} />
            Работа с элементами
          </h4>
          <ul className="doc-list">
            <li className="doc-item">
              <strong>Выбор:</strong> Кликните на элемент для выбора (появится
              рамка)
            </li>
            <li className="doc-item">
              <strong>Перемещение:</strong> Перетащите элемент за любую область
            </li>
            <li className="doc-item">
              <strong>Изменение размера:</strong> Используйте угловые маркеры
            </li>
            <li className="doc-item">
              <strong>Привязка к сетке:</strong> Удерживайте Shift при
              перемещении/изменении размера
            </li>
            <li className="doc-item">
              <strong>Удаление:</strong> Нажмите Delete или кнопку "Удалить
              элемент"
            </li>
            <li className="doc-item">
              <strong>Слои:</strong> Используйте "На передний/задний план" для
              изменения порядка
            </li>
          </ul>
        </div>
      );
    case "tables":
      return (
        <div className="doc-content">
          <h4 className="doc-heading">
            <TableIcon size={18} />
            Работа с таблицами
          </h4>
          <ul className="doc-list">
            <li className="doc-item">
              <strong>Редактирование ячеек:</strong> Кликните дважды по ячейке и
              начните вводить текст
            </li>
            <li className="doc-item">
              <strong>Изменение размера:</strong> Измените размеры таблицы в
              панели свойств
            </li>
            <li className="doc-item">
              <strong>Строки и столбцы:</strong> Используйте ползунки для
              добавления/удаления
            </li>
            <li className="doc-item">
              <strong>Цвет границ:</strong> Можно изменить цвет и толщину границ
            </li>
          </ul>
        </div>
      );
    case "export":
      return (
        <div className="doc-content">
          <h4 className="doc-heading">
            <Download size={18} />
            Экспорт документов
          </h4>
          <ul className="doc-list">
            <li className="doc-item">
              <strong>DOCX:</strong> Экспорт в формат Word с сохранением
              форматирования и таблиц
            </li>
            <li className="doc-item">
              <strong>HTML:</strong> Экспорт для веб-страниц с абсолютным
              позиционированием
            </li>
            <li className="doc-item">
              <strong>Сохранение:</strong> Автосохранение черновика каждые 30
              секунд
            </li>
          </ul>
        </div>
      );
    case "copy":
      return (
        <div className="doc-content">
          <h4 className="doc-heading">
            <Copy size={18} />
            Копирование и вставка
          </h4>
          <ul className="doc-list">
            <li className="doc-item">
              <strong>Копирование:</strong> Выберите элемент и нажмите Ctrl+C
            </li>
            <li className="doc-item">
              <strong>Вставка:</strong> Нажмите Ctrl+V для вставки
              скопированного элемента
            </li>
            <li className="doc-item">
              <strong>Кнопка:</strong> Также можно использовать кнопку
              "Копировать элемент"
            </li>
          </ul>
        </div>
      );
  }
};

export default DetailedDocumentation;
