import { jsPDF } from "jspdf";

export const PDF_UNICODE_FONT_FAMILY = "AppUnicode";

const FONT_CANDIDATES = [
  { url: "/fonts/NotoSans-Regular.ttf", vfsName: "NotoSans-Regular.ttf" },
  { url: "/fonts/DejaVuSans.ttf", vfsName: "DejaVuSans.ttf" },
  { url: "/fonts/LiberationSans-Regular.ttf", vfsName: "LiberationSans-Regular.ttf" },
] as const;

let cachedFontStatus: "unknown" | "good" | "bad" = "unknown";

function hasUsableUnicodeMetrics(doc: jsPDF, family: string): boolean {
  try {
    doc.setFont(family, "normal");
    // splitTextToSize обращается к Unicode-метрикам шрифта.
    // Если cmap сломан, здесь произойдет ошибка.
    doc.splitTextToSize("Test Привет", 120);
    return true;
  } catch {
    return false;
  }
}

export const loadCustomFont = async (doc: jsPDF): Promise<boolean> => {
  if (cachedFontStatus === "good") {
    try {
      doc.setFont(PDF_UNICODE_FONT_FAMILY, "normal");
      return true;
    } catch {
      cachedFontStatus = "bad";
      return false;
    }
  }

  if (cachedFontStatus === "bad") {
    return false;
  }

  for (const candidate of FONT_CANDIDATES) {
    try {
      const response = await fetch(candidate.url);
      if (!response.ok) continue;

      const blob = await response.blob();
      const base64data = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const encoded = (reader.result as string).split(",")[1];
          resolve(encoded || null);
        };
        reader.readAsDataURL(blob);
      });

      if (!base64data) continue;

      doc.addFileToVFS(candidate.vfsName, base64data);
      doc.addFont(candidate.vfsName, PDF_UNICODE_FONT_FAMILY, "normal");

      if (hasUsableUnicodeMetrics(doc, PDF_UNICODE_FONT_FAMILY)) {
        cachedFontStatus = "good";
        return true;
      }
    } catch (fontError) {
      console.warn(`Custom PDF font candidate failed (${candidate.url})`, fontError);
    }
  }

  cachedFontStatus = "bad";
  return false;
};
