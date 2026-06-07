from pydantic import BaseModel
from typing import List, Optional


class UploadResponse(BaseModel):
    doc_id: str
    filename: str
    num_pages: int
    num_chunks: int
    message: str


class QueryRequest(BaseModel):
    doc_id: str
    question: str


class SourceChunk(BaseModel):
    page: int
    text: str
    score: float


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
