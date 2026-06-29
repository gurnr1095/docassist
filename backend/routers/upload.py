import json
import logging
import os
import threading
import uuid
from typing import Dict

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.config import settings
from backend.models.schemas import UploadResponse
from backend.services.pdf_service import process_pdf
from backend.services.vector_service import store_chunks

logger = logging.getLogger(__name__)
router = APIRouter()

DOC_REGISTRY_PATH = "./doc_registry.json"
_registry_lock = threading.Lock()

PDF_MAGIC = b"%PDF-"


def load_registry() -> Dict:
    if os.path.exists(DOC_REGISTRY_PATH):
        with open(DOC_REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_registry(registry: Dict) -> None:
    with open(DOC_REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF document."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    doc_id = str(uuid.uuid4())
    file_path = os.path.join(settings.upload_dir, f"{doc_id}.pdf")
    vectors_stored = False

    try:
        content = await file.read()

        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(content) > settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="File exceeds the 50 MB size limit.")
        if content[:5] != PDF_MAGIC:
            raise HTTPException(status_code=415, detail="File does not appear to be a valid PDF.")

        with open(file_path, "wb") as f:
            f.write(content)

        result = process_pdf(file_path)

        if result["num_chunks"] == 0:
            raise HTTPException(
                status_code=422,
                detail="No text could be extracted from this PDF. It may be scanned or image-only.",
            )

        store_chunks(doc_id=doc_id, chunks=result["chunks"], doc_metadata={"filename": file.filename})
        vectors_stored = True

        with _registry_lock:
            registry = load_registry()
            registry[doc_id] = {
                "filename": file.filename,
                "num_pages": result["num_pages"],
                "num_chunks": result["num_chunks"],
            }
            save_registry(registry)

        logger.info(
            "PDF uploaded",
            extra={"doc_id": doc_id, "doc_name": file.filename, "chunks": result["num_chunks"]},
        )

        return UploadResponse(
            doc_id=doc_id,
            filename=file.filename,
            num_pages=result["num_pages"],
            num_chunks=result["num_chunks"],
            message=f"Successfully processed '{file.filename}' into {result['num_chunks']} semantic chunks.",
            model=settings.llm_model,
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("Upload failed", exc_info=exc, extra={"doc_name": file.filename})
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {exc}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
        if not vectors_stored:
            try:
                from backend.services.vector_service import delete_document
                delete_document(doc_id)
            except Exception:
                pass


@router.get("/documents")
async def list_documents():
    """List all uploaded documents."""
    with _registry_lock:
        registry = load_registry()
    docs = [
        {"doc_id": doc_id, "filename": meta["filename"], "num_pages": meta["num_pages"], "num_chunks": meta["num_chunks"]}
        for doc_id, meta in registry.items()
    ]
    return {"documents": docs}


@router.delete("/documents/{doc_id}")
async def delete_document_endpoint(doc_id: str):
    """Delete a document and its vector data."""
    from backend.services.vector_service import delete_document as delete_vec

    with _registry_lock:
        registry = load_registry()
        if doc_id not in registry:
            raise HTTPException(status_code=404, detail="Document not found.")
        filename = registry[doc_id]["filename"]

    try:
        delete_vec(doc_id)
    except Exception as exc:
        logger.warning("Vector deletion failed", extra={"doc_id": doc_id, "error": str(exc)})

    with _registry_lock:
        registry = load_registry()
        registry.pop(doc_id, None)
        save_registry(registry)

    logger.info("Document deleted", extra={"doc_id": doc_id, "doc_name": filename})
    return {"message": f"Document '{filename}' deleted successfully.", "doc_id": doc_id}
