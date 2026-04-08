from weasyprint import HTML
import io


def generate_pdf_from_html(html_content: str) -> bytes:
    """
    Генерация PDF из HTML строки с помощью WeasyPrint.
    Корректно обрабатывает Base64 изображения, вшитые в теги <img>.
    """
    buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(target=buffer)
    buffer.seek(0)
    return buffer.getvalue()
