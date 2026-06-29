from pydantic import BaseModel, Field, field_validator
from typing import List


class UploadResponse(BaseModel):
    doc_id: str
    filename: str
    num_pages: int = Field(..., ge=0)
    num_chunks: int = Field(..., ge=0)
    message: str
    model: str = ""

    model_config = {
        "json_schema_extra": {
            "example": {
                "doc_id": "550e8400-e29b-41d4-a716-446655440000",
                "filename": "report.pdf",
                "num_pages": 10,
                "num_chunks": 45,
                "message": "Successfully processed 'report.pdf' into 45 semantic chunks.",
                "model": "mistral-small-latest",
            }
        }
    }


class QueryRequest(BaseModel):
    doc_id: str = Field(..., min_length=36, max_length=36, description="UUID of the document")
    question: str = Field(..., min_length=1, max_length=2000, description="Question to ask about the document")

    @field_validator("question")
    @classmethod
    def strip_and_validate_question(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Question cannot be blank or whitespace only")
        return stripped


class SourceChunk(BaseModel):
    page: int = Field(..., ge=1)
    text: str = Field(..., min_length=1)
    score: float = Field(..., ge=0.0, le=1.0)


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    doc_id: str
    question: str


class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    num_pages: int
    num_chunks: int


class DeleteResponse(BaseModel):
    message: str
    doc_id: str
