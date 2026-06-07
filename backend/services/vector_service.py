import chromadb
from chromadb.utils import embedding_functions
from typing import List, Dict
from backend.config import CHROMA_PERSIST_DIR, TOP_K_RESULTS
import json


# Use sentence-transformers for local embeddings (free, no API key needed)
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

_client = None
_ef = None


def get_chroma_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    return _client


def get_embedding_function():
    global _ef
    if _ef is None:
        _ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )
    return _ef


def get_or_create_collection(doc_id: str):
    client = get_chroma_client()
    ef = get_embedding_function()
    collection_name = f"doc_{doc_id.replace('-', '_')}"
    collection = client.get_or_create_collection(
        name=collection_name,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


def store_chunks(doc_id: str, chunks: List[Dict], doc_metadata: Dict) -> None:
    """
    Embed and store document chunks in ChromaDB.
    """
    collection = get_or_create_collection(doc_id)

    documents = [chunk["text"] for chunk in chunks]
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "page": chunk["page"],
            "doc_id": doc_id,
            "filename": doc_metadata.get("filename", ""),
        }
        for chunk in chunks
    ]

    # Batch upsert
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        collection.upsert(
            documents=documents[i:i + batch_size],
            ids=ids[i:i + batch_size],
            metadatas=metadatas[i:i + batch_size],
        )


def similarity_search(doc_id: str, query: str, top_k: int = TOP_K_RESULTS) -> List[Dict]:
    """
    Embed the query and retrieve top-K most similar chunks from ChromaDB.
    Returns list of { text, page, score }.
    """
    collection = get_or_create_collection(doc_id)

    results = collection.query(
        query_texts=[query],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"]
    )

    sources = []
    if results["documents"] and results["documents"][0]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        ):
            # Convert cosine distance to similarity score (0–1)
            score = round(1 - dist, 4)
            sources.append({
                "text": doc,
                "page": meta.get("page", 0),
                "score": score
            })

    # Sort by score descending
    sources.sort(key=lambda x: x["score"], reverse=True)
    return sources


def delete_document(doc_id: str) -> bool:
    """Delete a document collection from ChromaDB."""
    client = get_chroma_client()
    collection_name = f"doc_{doc_id.replace('-', '_')}"
    try:
        client.delete_collection(name=collection_name)
        return True
    except Exception:
        return False


def list_collections() -> List[str]:
    """List all document collection names."""
    client = get_chroma_client()
    return [c.name for c in client.list_collections()]
