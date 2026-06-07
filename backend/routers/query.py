import logging
from fastapi import APIRouter, HTTPException
from backend.models.schemas import QueryRequest, QueryResponse, SourceChunk
from backend.services.vector_service import similarity_search
from backend.services.llm_service import generate_answer
from backend.routers.upload import load_registry

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """Answer a question about an uploaded document using RAG."""

    # Validate document exists
    registry = load_registry()
    if request.doc_id not in registry:
        raise HTTPException(status_code=404, detail="Document not found. Please upload it first.")

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        # Step 1: Retrieve top-K relevant chunks via similarity search
        sources = similarity_search(
            doc_id=request.doc_id,
            query=request.question
        )

        # Step 2: Generate LLM answer with retrieved context
        answer = generate_answer(
            question=request.question,
            sources=sources
        )

        # Step 3: Build source chunk response objects
        source_chunks = [
            SourceChunk(
                page=s["page"],
                text=s["text"],
                score=s["score"]
            )
            for s in sources
        ]

        return QueryResponse(
            answer=answer,
            sources=source_chunks,
            doc_id=request.doc_id,
            question=request.question
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
