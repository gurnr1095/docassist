import logging
import time
from contextlib import asynccontextmanager

from pythonjsonlogger import jsonlogger
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.routers import upload, query


def setup_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(
        jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    logging.root.setLevel(settings.log_level.upper())
    logging.root.handlers = [handler]


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    settings.validate_on_startup()
    logging.getLogger("docassist").info(
        "DocAssist API starting",
        extra={"version": "1.0.0", "model": settings.llm_model},
    )
    yield
    logging.getLogger("docassist").info("DocAssist API shutting down")


app = FastAPI(
    title="DocAssist API",
    description="RAG-based PDF Q&A system powered by LangChain, ChromaDB & Mistral",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger = logging.getLogger("docassist.http")
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logging.getLogger("docassist").error(
        "Unhandled exception",
        exc_info=exc,
        extra={"path": request.url.path},
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(upload.router, prefix="/api", tags=["Documents"])
app.include_router(query.router, prefix="/api", tags=["Q&A"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "DocAssist API is running", "docs": "/docs"}


@app.get("/health", tags=["Health"])
async def health():
    from backend.services.vector_service import get_chroma_client

    chroma_ok = False
    try:
        get_chroma_client().heartbeat()
        chroma_ok = True
    except Exception:
        pass

    api_key_set = bool(settings.mistral_api_key)
    status = "healthy" if (chroma_ok and api_key_set) else "degraded"
    return {
        "status": status,
        "chromadb": chroma_ok,
        "llm_api_key_set": api_key_set,
        "model": settings.llm_model,
    }
