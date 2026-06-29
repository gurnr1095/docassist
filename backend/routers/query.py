import logging

from fastapi import APIRouter, HTTPException

from backend.models.schemas import QueryRequest, QueryResponse, SourceChunk
from backend.services.llm_service import generate_answer
from backend.services.vector_service import similarity_search
from backend.routers.upload import load_registry, _registry_lock

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """Answer a question about an uploaded document using RAG."""
    with _registry_lock:
        registry = load_registry()

    if request.doc_id not in registry:
        raise HTTPException(status_code=404, detail="Document not found. Please upload it first.")

    logger.info(
        "Query received",
        extra={"doc_id": request.doc_id, "question_len": len(request.question)},
    )

    try:
        sources = similarity_search(doc_id=request.doc_id, query=request.question)
        answer = generate_answer(question=request.question, sources=sources)

        source_chunks = [
            SourceChunk(page=s["page"], text=s["text"], score=s["score"]) for s in sources
        ]

        logger.info(
            "Query answered",
            extra={"doc_id": request.doc_id, "sources_used": len(sources)},
        )

        return QueryResponse(
            answer=answer,
            sources=source_chunks,
            doc_id=request.doc_id,
            question=request.question,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Query failed", exc_info=exc, extra={"doc_id": request.doc_id})
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}")
