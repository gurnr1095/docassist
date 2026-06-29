import logging
import threading
from typing import List, Dict

import chromadb
from chromadb.utils import embedding_functions

from backend.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "all-MiniLM-L6-v2"

_client_lock = threading.Lock()
_ef_lock = threading.Lock()
_client = None
_ef = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
                logger.info("ChromaDB client initialised", extra={"path": settings.chroma_persist_dir})
    return _client


def get_embedding_function():
    global _ef
    if _ef is None:
        with _ef_lock:
            if _ef is None:
                _ef = embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name=EMBEDDING_MODEL
                )
                logger.info("Embedding function loaded", extra={"model": EMBEDDING_MODEL})
    return _ef


def get_or_create_collection(doc_id: str):
    client = get_chroma_client()
    ef = get_embedding_function()
    collection_name = f"doc_{doc_id.replace('-', '_')}"
    return client.get_or_create_collection(
        name=collection_name,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )


def store_chunks(doc_id: str, chunks: List[Dict], doc_metadata: Dict) -> None:
    collection = get_or_create_collection(doc_id)
    documents = [chunk["text"] for chunk in chunks]
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {"page": chunk["page"], "doc_id": doc_id, "filename": doc_metadata.get("filename", "")}
        for chunk in chunks
    ]
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        collection.upsert(
            documents=documents[i : i + batch_size],
            ids=ids[i : i + batch_size],
            metadatas=metadatas[i : i + batch_size],
        )
    logger.info("Chunks stored", extra={"doc_id": doc_id, "count": len(chunks)})


def similarity_search(doc_id: str, query: str, top_k: int = None) -> List[Dict]:
    if top_k is None:
        top_k = settings.top_k_results

    collection = get_or_create_collection(doc_id)
    count = collection.count()
    if count == 0:
        logger.warning("Collection is empty", extra={"doc_id": doc_id})
        return []

    results = collection.query(
        query_texts=[query],
        n_results=min(top_k, count),
        include=["documents", "metadatas", "distances"],
    )

    sources: List[Dict] = []
    if results["documents"] and results["documents"][0]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            score = round(max(0.0, min(1.0, 1 - dist)), 4)
            sources.append({"text": doc, "page": meta.get("page", 1), "score": score})

    sources.sort(key=lambda x: x["score"], reverse=True)
    return sources


def delete_document(doc_id: str) -> None:
    client = get_chroma_client()
    collection_name = f"doc_{doc_id.replace('-', '_')}"
    try:
        client.delete_collection(name=collection_name)
        logger.info("Collection deleted", extra={"doc_id": doc_id})
    except Exception as exc:
        logger.warning("Failed to delete collection", extra={"doc_id": doc_id, "error": str(exc)})
        raise


def list_collections() -> List[str]:
    client = get_chroma_client()
    return [c.name for c in client.list_collections()]
