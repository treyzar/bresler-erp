# project/app/views.py
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from ..models.models import ParsedDocument
from ..services.utils.parser import parse_file
from .serializers import ParsedDocumentSerializer, ParseUploadSerializer


@api_view(["POST"])
@parser_classes([MultiPartParser])
def parse_document(request):
    serializer = ParseUploadSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    uploaded_file = serializer.validated_data["file"]
    filename = uploaded_file.name
    ext = filename.lower().split(".")[-1] if "." in filename else ""

    if not ext:
        return Response({"error": "File has no extension"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = parse_file(uploaded_file, ext)
        page_count = len(data["elements"]) // 30 or None  # приблизительно
    except Exception as e:
        return Response({"error": f"Failed to parse document: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uploaded_file.seek(0)  # важно перед сохранением файла

        parsed_doc = ParsedDocument.objects.create(
            original_filename=filename,
            file_type=ext.upper(),
            file_size=uploaded_file.size,
            page_count=page_count,
            extracted_text=data["text"],
            editor_json={"elements": data["elements"]},
            original_file=uploaded_file,
        )

        return Response(
            ParsedDocumentSerializer(parsed_doc, context={"request": request}).data, status=status.HTTP_201_CREATED
        )
    except Exception as e:
        return Response({"error": f"Failed to save document: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_parsed_document(request, pk):
    parsed_doc = get_object_or_404(ParsedDocument, pk=pk)
    serializer = ParsedDocumentSerializer(parsed_doc, context={"request": request})
    return Response(serializer.data)
