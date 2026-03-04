from django.db import models


class ParsedDocument(models.Model):
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)  # PDF / DOCX
    file_size = models.IntegerField()
    page_count = models.IntegerField(null=True, blank=True)

    # новые поля
    editor_json = models.JSONField(default=dict, blank=True)  # структура для редактора
    extracted_text = models.TextField(blank=True)  # оставляем для обратной совместимости

    original_file = models.FileField(upload_to='parsed_documents/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_filename
