from playwright.sync_api import sync_playwright
import logging

logger = logging.getLogger(__name__)

class PDFExportService:
    @staticmethod
    def _inject_print_css(raw_html: str) -> str:
        """Принудительно заставляет абсолютные элементы отображаться на A4."""
        css = """
        <style>
            @page { size: A4; margin: 0; }
            body { 
                font-family: Arial, sans-serif; 
                -webkit-print-color-adjust: exact; 
                margin: 0; 
                padding: 0;
            }
            .canvas-print {
                margin: 0 auto;
                page-break-inside: avoid;
                overflow: hidden;
            }
            table { 
                border-collapse: collapse !important; 
                width: 100% !important; 
                table-layout: fixed !important;
            }
            td, th { 
                border: 0.5pt solid black; 
                word-break: break-all;
            }
            /* Убеждаемся, что изображения печатаются корректно */
            img { max-width: 100%; }
        </style>
        """
        # Если пришел только кусок HTML, оборачиваем его
        if "<html>" not in raw_html:
            return f"<!DOCTYPE html><html><head><meta charset='UTF-8'>{css}</head><body>{raw_html}</body></html>"
        
        # Если уже полный документ, вставляем стили в head
        if "</head>" in raw_html:
            return raw_html.replace("</head>", f"{css}</head>")
        
        return raw_html

    @classmethod
    def generate(cls, html_content: str, base_url: str = None) -> bytes:
        clean_html = cls._inject_print_css(html_content or "")
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(args=['--no-sandbox', '--disable-setuid-sandbox'])
                # JS отключаем — наши шаблоны статичные, это ускоряет рендер и исключает зависания.
                page = browser.new_page(java_script_enabled=False)
                # Явный таймаут: без него networkidle мог висеть по 30с на битых image src.
                page.set_default_timeout(15000)

                # "load" достаточно для статичного HTML; "networkidle" провоцировал таймауты.
                page.set_content(clean_html, wait_until="load")

                pdf_bytes = page.pdf(
                    format="A4",
                    print_background=True,
                    margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
                )
                browser.close()
                return pdf_bytes
        except Exception as e:
            logger.error(f"PDF Export Service Error: {e}", exc_info=True)
            raise RuntimeError(f"Failed to generate PDF: {str(e)}")
