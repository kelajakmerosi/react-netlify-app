#!/usr/bin/env python3
import argparse
import json
import re
import sys
import zipfile
from xml.etree import ElementTree as ET


def extract_docx_text(path: str):
    warnings = []
    text_chunks = []
    try:
        with zipfile.ZipFile(path, "r") as zf:
            xml_bytes = zf.read("word/document.xml")
        root = ET.fromstring(xml_bytes)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        for paragraph in root.findall(".//w:p", ns):
            texts = paragraph.findall(".//w:t", ns)
            line = "".join(node.text or "" for node in texts).strip()
            if line:
                text_chunks.append(line)
        return {
            "text": "\n".join(text_chunks),
            "warnings": warnings,
            "images": [],
        }
    except Exception as exc:
        return {"error": f"Failed to parse DOCX: {exc}"}


def extract_pdf_text(path: str):
    warnings = []
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        return {"error": "PDF parsing requires pypdf package"}

    try:
        reader = PdfReader(path)
        text_chunks = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                text_chunks.append(page_text)
        if not text_chunks:
            warnings.append("No selectable text extracted from PDF pages")
        return {
            "text": "\n".join(text_chunks),
            "warnings": warnings,
            "images": [],
        }
    except Exception as exc:
        return {"error": f"Failed to parse PDF: {exc}"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--type", required=True, choices=["docx", "pdf"])
    args = parser.parse_args()

    if args.type == "docx":
        result = extract_docx_text(args.source)
    else:
        result = extract_pdf_text(args.source)

    print(json.dumps(result, ensure_ascii=False))
    if "error" in result:
        sys.exit(1)


if __name__ == "__main__":
    main()
