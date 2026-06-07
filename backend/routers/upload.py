import uuid
import os
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.models.schemas import UploadResponse
from backend.services.pdf_service import process_pdf
from backend.services.vector_service import store_chunks
from backend.config import UPLOAD_DIR

router = APIRouter()

# In-memory document registry (persisted to JSON for simplicity)
DOC_REGISTRY_PATH = "./doc_registry.json"


def load_registry() -> dict:
    if os.path.exists(DOC_REGISTRY_PATH):
        with open(DOC_REGISTRY_PATH, "r") as f:
            return json.load(f)
    return {}


def save_registry(registry: dict):
    with open(DOC_REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF document."""

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Generate unique doc ID
    doc_id = str(uuid.uuid4())

    # Save uploaded file temporarily
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        with open(file_path, "wb") as f:
            f.write(content)

        # Process PDF: extract + chunk
        result = process_pdf(file_path)

        if result["num_chunks"] == 0:
            raise HTTPException(status_code=422, detail="No text could be extracted from the PDF.")

        # Store chunks in ChromaDB
        store_chunks(
            doc_id=doc_id,
            chunks=result["chunks"],
            doc_metadata={"filename": file.filename}
        )

        # Save to registry
        registry = load_registry()
        registry[doc_id] = {
            "filename": file.filename,
            "num_pages": result["num_pages"],
            "num_chunks": result["num_chunks"]
        }
        save_registry(registry)

        return UploadResponse(
            doc_id=doc_id,
            filename=file.filename,
            num_pages=result["num_pages"],
            num_chunks=result["num_chunks"],
            message=f"Successfully processed '{file.filename}' into {result['num_chunks']} semantic chunks."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)


@router.get("/documents")
async def list_documents():
    """List all uploaded documents."""
    registry = load_registry()
    docs = []
    for doc_id, meta in registry.items():
        docs.append({
            "doc_id": doc_id,
            "filename": meta["filename"],
            "num_pages": meta["num_pages"],
            "num_chunks": meta["num_chunks"]
        })
    return {"documents": docs}


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and its vector data."""
    from backend.services.vector_service import delete_document as delete_vec

    registry = load_registry()
    if doc_id not in registry:
        raise HTTPException(status_code=404, detail="Document not found.")

    filename = registry[doc_id]["filename"]
    delete_vec(doc_id)
    del registry[doc_id]
    save_registry(registry)

    return {"message": f"Document '{filename}' deleted successfully.", "doc_id": doc_id}
