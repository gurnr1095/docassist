import logging
import re
from typing import List, Dict

import fitz  # PyMuPDF

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

from backend.config import settings

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> List[Dict]:
    try:
        doc = fitz.open(file_path)
    except Exception as exc:
        logger.error("Failed to open PDF", extra={"file": file_path, "error": str(exc)})
        raise ValueError(f"Cannot read PDF — it may be corrupted or password-protected: {exc}") from exc

    pages: List[Dict] = []
    try:
        for page_num in range(len(doc)):
            try:
                page = doc[page_num]
                text = page.get_text("text")
                text = re.sub(r"\n{3,}", "\n\n", text).strip()
                if text:
                    pages.append({"page": page_num + 1, "text": text})
            except Exception as exc:
                logger.warning(
                    "Skipping unreadable page",
                    extra={"file": file_path, "page": page_num + 1, "error": str(exc)},
                )
                continue
    finally:
        doc.close()

    logger.info("PDF extracted", extra={"file": file_path, "pages_with_text": len(pages)})
    return pages


def semantic_chunk_pages(
    pages: List[Dict],
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[Dict]:
    if chunk_size is None:
        chunk_size = settings.max_chunk_size
    if chunk_overlap is None:
        chunk_overlap = settings.chunk_overlap

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
        length_function=len,
    )

    chunks: List[Dict] = []
    for page_data in pages:
        for chunk_text in splitter.split_text(page_data["text"]):
            if chunk_text.strip():
                chunks.append({"text": chunk_text.strip(), "page": page_data["page"]})

    return chunks


def process_pdf(file_path: str) -> Dict:
    pages = extract_text_from_pdf(file_path)
    chunks = semantic_chunk_pages(pages)
    logger.info(
        "PDF processed",
        extra={"file": file_path, "pages": len(pages), "chunks": len(chunks)},
    )
    return {"num_pages": len(pages), "num_chunks": len(chunks), "chunks": chunks}
