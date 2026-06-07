import fitz  # PyMuPDF
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import List, Dict
import re


def extract_text_from_pdf(file_path: str) -> List[Dict]:
    """
    Extract text from each page of a PDF using PyMuPDF.
    Returns a list of dicts with page number and text.
    """
    doc = fitz.open(file_path)
    pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        # Clean up excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text).strip()
        if text:
            pages.append({
                "page": page_num + 1,
                "text": text
            })

    doc.close()
    return pages


def semantic_chunk_pages(pages: List[Dict], chunk_size: int = 800, chunk_overlap: int = 100) -> List[Dict]:
    """
    Apply semantic chunking using LangChain's RecursiveCharacterTextSplitter.
    Preserves page metadata per chunk.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
        length_function=len,
    )

    chunks = []
    for page_data in pages:
        page_num = page_data["page"]
        text = page_data["text"]

        page_chunks = splitter.split_text(text)
        for chunk in page_chunks:
            if chunk.strip():
                chunks.append({
                    "text": chunk.strip(),
                    "page": page_num
                })

    return chunks


def process_pdf(file_path: str, chunk_size: int = 800, chunk_overlap: int = 100) -> Dict:
    """
    Full pipeline: extract + chunk a PDF.
    Returns pages, chunks, and metadata.
    """
    pages = extract_text_from_pdf(file_path)
    chunks = semantic_chunk_pages(pages, chunk_size, chunk_overlap)

    return {
        "num_pages": len(pages),
        "num_chunks": len(chunks),
        "chunks": chunks
    }
