from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import upload, query

app = FastAPI(
    title="DocAssist API",
    description="RAG-based PDF Q&A system powered by LangChain, ChromaDB & OpenRouter",
    version="1.0.0"
)

# Allow React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Documents"])
app.include_router(query.router, prefix="/api", tags=["Q&A"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "message": "DocAssist API is running",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
