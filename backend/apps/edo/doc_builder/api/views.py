import json
import os
from django.http import HttpResponse, FileResponse
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models.models import DocumentProject, DocumentFile
from .serializers import (
    DocumentProjectSerializer,
    DocumentProjectListSerializer,
    DocumentProjectCreateSerializer,
    DocumentProjectUpdateSerializer,
    DocxUploadSerializer,
    PdfUploadSerializer,
    JsonUploadSerializer,
)
from ..services.converters import (
    normalize_owner_id,
    editor_json_to_plain_text,
    editor_json_to_docx_bytes,
    editor_json_to_pdf_bytes,
    docx_file_to_editor_json,
    pdf_file_to_editor_json,
)


class ProjectListCreateView(APIView):
    def get(self, request):
        owner_id = normalize_owner_id(request)
        projects = DocumentProject.objects.filter(owner_id=owner_id)
        serializer = DocumentProjectListSerializer(projects, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        owner_id = normalize_owner_id(request)
        serializer = DocumentProjectCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            project = DocumentProject.objects.create(
                owner_id=owner_id,
                title=serializer.validated_data.get('title', 'Untitled Document'),
                content_json=serializer.validated_data.get('content_json', {}),
                content_text=serializer.validated_data.get('content_text', ''),
            )
            return Response(DocumentProjectSerializer(project).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectDetailView(APIView):
    def get_object(self, pk, request):
        owner_id = normalize_owner_id(request)
        try:
            return DocumentProject.objects.get(pk=pk, owner_id=owner_id)
        except DocumentProject.DoesNotExist:
            return None
    
    def get(self, request, pk):
        project = self.get_object(pk, request)
        if not project:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = DocumentProjectSerializer(project)
        return Response(serializer.data)
    
    def patch(self, request, pk):
        project = self.get_object(pk, request)
        if not project:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = DocumentProjectUpdateSerializer(project, data=request.data, partial=True)
        
        if serializer.is_valid():
            for attr, value in serializer.validated_data.items():
                setattr(project, attr, value)
            
            if 'content_json' in serializer.validated_data:
                project.content_text = editor_json_to_plain_text(project.content_json)
            
            project.save()
            return Response(DocumentProjectSerializer(project).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        project = self.get_object(pk, request)
        if not project:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExportJsonView(APIView):
    def get(self, request, pk):
        owner_id = normalize_owner_id(request)
        try:
            project = DocumentProject.objects.get(pk=pk, owner_id=owner_id)
        except DocumentProject.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        export_data = {
            'schema_version': project.schema_version,
            'title': project.title,
            'content_json': project.content_json,
            'content_text': project.content_text,
        }
        
        response = HttpResponse(
            json.dumps(export_data, ensure_ascii=False, indent=2),
            content_type='application/json'
        )
        safe_title = ''.join(c for c in project.title if c.isalnum() or c in ' -_').strip()
        filename = f"{safe_title or 'document'}.docflow.json"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ImportJsonView(APIView):
    def post(self, request):
        serializer = JsonUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = serializer.validated_data['file']
        
        try:
            content = uploaded_file.read().decode('utf-8')
            data = json.loads(content)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            return Response({'error': f'Invalid JSON file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        owner_id = normalize_owner_id(request)
        
        project = DocumentProject.objects.create(
            owner_id=owner_id,
            title=data.get('title', 'Imported Document'),
            schema_version=data.get('schema_version', 1),
            content_json=data.get('content_json', {}),
            content_text=data.get('content_text', editor_json_to_plain_text(data.get('content_json', {}))),
        )
        
        return Response(DocumentProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ExportDocxView(APIView):
    def post(self, request, pk):
        owner_id = normalize_owner_id(request)
        try:
            project = DocumentProject.objects.get(pk=pk, owner_id=owner_id)
        except DocumentProject.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            docx_bytes = editor_json_to_docx_bytes(project.content_json)
        except Exception as e:
            return Response({'error': f'Failed to generate DOCX: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        save_to_media = request.data.get('save_to_media', False)
        
        if save_to_media:
            safe_title = ''.join(c for c in project.title if c.isalnum() or c in ' -_').strip()
            filename = f"{safe_title or 'document'}.docx"
            
            doc_file = DocumentFile.objects.create(
                project=project,
                file_type='docx',
            )
            doc_file.file.save(filename, ContentFile(docx_bytes))
            doc_file.save()
        
        response = HttpResponse(
            docx_bytes,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        safe_title = ''.join(c for c in project.title if c.isalnum() or c in ' -_').strip()
        filename = f"{safe_title or 'document'}.docx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ExportPdfView(APIView):
    def post(self, request, pk):
        owner_id = normalize_owner_id(request)
        try:
            project = DocumentProject.objects.get(pk=pk, owner_id=owner_id)
        except DocumentProject.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            pdf_bytes = editor_json_to_pdf_bytes(project.content_json)
        except Exception as e:
            return Response({'error': f'Failed to generate PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        save_to_media = request.data.get('save_to_media', False)
        
        if save_to_media:
            safe_title = ''.join(c for c in project.title if c.isalnum() or c in ' -_').strip()
            filename = f"{safe_title or 'document'}.pdf"
            
            doc_file = DocumentFile.objects.create(
                project=project,
                file_type='pdf',
            )
            doc_file.file.save(filename, ContentFile(pdf_bytes))
            doc_file.save()
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        safe_title = ''.join(c for c in project.title if c.isalnum() or c in ' -_').strip()
        filename = f"{safe_title or 'document'}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ImportDocxView(APIView):
    def post(self, request):
        serializer = DocxUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = serializer.validated_data['file']
        
        try:
            content_json = docx_file_to_editor_json(uploaded_file)
        except Exception as e:
            return Response({'error': f'Failed to parse DOCX: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        owner_id = normalize_owner_id(request)
        
        title = os.path.splitext(uploaded_file.name)[0]
        
        project = DocumentProject.objects.create(
            owner_id=owner_id,
            title=title,
            content_json=content_json,
            content_text=editor_json_to_plain_text(content_json),
        )
        
        return Response(DocumentProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ImportPdfView(APIView):
    def post(self, request):
        serializer = PdfUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = serializer.validated_data['file']
        
        try:
            content_json = pdf_file_to_editor_json(uploaded_file)
        except Exception as e:
            return Response({'error': f'Failed to parse PDF: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        owner_id = normalize_owner_id(request)
        
        title = os.path.splitext(uploaded_file.name)[0]
        
        project = DocumentProject.objects.create(
            owner_id=owner_id,
            title=title,
            content_json=content_json,
            content_text=editor_json_to_plain_text(content_json),
        )
        
        return Response(DocumentProjectSerializer(project).data, status=status.HTTP_201_CREATED)
