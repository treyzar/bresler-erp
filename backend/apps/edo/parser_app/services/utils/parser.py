# project/app/utils/parser.py
from __future__ import annotations
from typing import Dict, Any
from .docx_parser import parse_docx
from .pdf_parser import parse_pdf
from .html_parser import parse_html

def parse_file(file_obj, ext: str) -> Dict[str, Any]:
    norm = ext.lower().lstrip(".") if isinstance(ext, str) else ""

    if norm in ["docx", "doc"]:
        return parse_docx(file_obj)
    
    if norm == "pdf":
        return parse_pdf(file_obj)
        
    if norm in ["html", "htm"]:
        return parse_html(file_obj)

    raise ValueError(f"Unsupported extension: {ext}")
