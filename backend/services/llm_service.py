import logging
import threading
from typing import List, Dict

from langchain_openai import ChatOpenAI

try:
    from langchain_core.messages import HumanMessage, SystemMessage
except ImportError:
    from langchain.schema import HumanMessage, SystemMessage

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from backend.config import settings

logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """You are DocAssist, an expert document analysis AI. Your job is to answer questions strictly based on the provided document context.

RULES:
- Answer ONLY from the context provided below. Do NOT use external knowledge.
- If the answer is not in the context, say: "I couldn't find relevant information about this in the document."
- Be concise, accurate, and well-structured.
- When referencing specific facts, mention the page number (e.g., "According to page 3...").
- Use bullet points or numbered lists when appropriate for clarity."""

_llm_lock = threading.Lock()
_llm_client: ChatOpenAI | None = None


def get_llm_client() -> ChatOpenAI:
    global _llm_client
    if _llm_client is None:
        with _llm_lock:
            if _llm_client is None:
                _llm_client = ChatOpenAI(
                    model=settings.llm_model,
                    api_key=settings.mistral_api_key,
                    base_url=settings.mistral_base_url,
                    temperature=0.2,
                    max_tokens=1024,
                    timeout=60,
                )
                logger.info("LLM client initialised", extra={"model": settings.llm_model})
    return _llm_client


def build_context_string(sources: List[Dict]) -> str:
    parts = [
        f"[Context {i} – Page {s['page']}]\n{s['text']}"
        for i, s in enumerate(sources, 1)
    ]
    return "\n\n---\n\n".join(parts)


@retry(
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def generate_answer(question: str, sources: List[Dict]) -> str:
    if not sources:
        return "I couldn't find any relevant context in the document to answer your question."

    context = build_context_string(sources)
    user_message = (
        f"DOCUMENT CONTEXT:\n{context}\n\n---\n\n"
        f"QUESTION: {question}\n\n"
        "Please answer the question based solely on the document context above."
    )

    llm = get_llm_client()
    messages = [SystemMessage(content=RAG_SYSTEM_PROMPT), HumanMessage(content=user_message)]
    response = llm.invoke(messages)

    usage = getattr(response, "response_metadata", {}).get("token_usage", {})
    logger.info(
        "LLM call completed",
        extra={
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
        },
    )

    return response.content.strip()
