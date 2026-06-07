from langchain_openai import ChatOpenAI
try:
    from langchain_core.messages import HumanMessage, SystemMessage
except ImportError:
    from langchain.schema import HumanMessage, SystemMessage
from typing import List, Dict
from backend.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, LLM_MODEL

RAG_SYSTEM_PROMPT = """You are DocAssist, an expert document analysis AI. Your job is to answer questions strictly based on the provided document context.

RULES:
- Answer ONLY from the context provided below. Do NOT use external knowledge.
- If the answer is not in the context, say: "I couldn't find relevant information about this in the document."
- Be concise, accurate, and well-structured.
- When referencing specific facts, mention the page number (e.g., "According to page 3...").
- Use bullet points or numbered lists when appropriate for clarity."""


def build_context_string(sources: List[Dict]) -> str:
    """Format retrieved chunks into a readable context block."""
    context_parts = []
    for i, source in enumerate(sources, 1):
        context_parts.append(
            f"[Context {i} – Page {source['page']}]\n{source['text']}"
        )
    return "\n\n---\n\n".join(context_parts)


def get_llm_client() -> ChatOpenAI:
    """Initialize LangChain ChatOpenAI pointing to OpenRouter."""
    return ChatOpenAI(
        model=LLM_MODEL,
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        temperature=0.2,
        max_tokens=1024,
        default_headers={
            "HTTP-Referer": "https://docassist.app",
            "X-Title": "DocAssist RAG"
        }
    )


def generate_answer(question: str, sources: List[Dict]) -> str:
    """
    Run the RAG pipeline: build context from retrieved chunks → call LLM → return answer.
    """
    if not sources:
        return "I couldn't find any relevant context in the document to answer your question."

    context = build_context_string(sources)

    user_message = f"""DOCUMENT CONTEXT:
{context}

---

QUESTION: {question}

Please answer the question based solely on the document context above."""

    llm = get_llm_client()
    messages = [
        SystemMessage(content=RAG_SYSTEM_PROMPT),
        HumanMessage(content=user_message)
    ]

    response = llm.invoke(messages)
    return response.content.strip()
