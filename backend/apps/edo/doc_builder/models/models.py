from django.db import models


class DocumentProject(models.Model):
    owner_id = models.IntegerField(default=1)
    title = models.CharField(max_length=255, default='Untitled Document')
    schema_version = models.IntegerField(default=1)
    content_json = models.JSONField(default=dict, blank=True)
    content_text = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} (ID: {self.id})"


class DocumentFile(models.Model):
    FILE_TYPE_CHOICES = [
        ('docx', 'DOCX'),
        ('pdf', 'PDF'),
        ('json', 'JSON'),
    ]
    
    project = models.ForeignKey(
        DocumentProject,
        on_delete=models.CASCADE,
        related_name='files'
    )
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    file = models.FileField(upload_to='doc_builder/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.title} - {self.file_type}"
