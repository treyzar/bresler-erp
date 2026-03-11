import { jsPDF } from "jspdf";

// Имя файла, который мы скопировали в public/fonts
const FONT_URL = "/fonts/LiberationSans-Regular.ttf";

export const loadCustomFont = async (doc: jsPDF): Promise<void> => {
  try {
    // 1. Загружаем шрифт из папки public
    const response = await fetch(FONT_URL);

    if (!response.ok) {
      throw new Error("Не удалось найти шрифт в public/fonts/");
    }

    const blob = await response.blob();

    // 2. Читаем файл и передаем в jsPDF
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Получаем чистый base64 без заголовка data:...
        const base64data = (reader.result as string).split(",")[1];

        if (base64data) {
          // Добавляем файл в виртуальную файловую систему PDF
          doc.addFileToVFS("LiberationSans-Regular.ttf", base64data);
          // Регистрируем шрифт под именем "MyFont"
          doc.addFont(
            "LiberationSans-Regular.ttf",
            "LiberationSans-Regular",
            "normal"
          );
          // Делаем его активным
          doc.setFont("LiberationSans-Regular");
        }
        resolve();
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Ошибка загрузки шрифта:", error);
    // Не падаем, чтобы PDF все равно создался (пусть и с кракозябрами)
  }
};
