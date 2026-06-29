
# 🤖 DocAssist – RAG-Based PDF Q&A

> AI-powered document assistant using Retrieval-Augmented Generation. Upload any PDF and get instant, accurate answers grounded in your document — with source citations and page references.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35?style=flat)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![OpenRouter](https://img.shields.io/badge/OpenRouter-7C3AED?style=flat)

---

## ✨ Features

- 📄 **PDF Upload & Parsing** — Drag-and-drop PDF upload with PyMuPDF text extraction
- 🧩 **Semantic Chunking** — LangChain `RecursiveCharacterTextSplitter` with sentence-aware boundaries
- 🔍 **Vector Similarity Search** — ChromaDB with `all-MiniLM-L6-v2` local embeddings (no API cost)
- 🤖 **LLM-Powered Answers** — Any OpenRouter model, strictly grounded in document context
- 📌 **Source Citations** — Every answer includes the exact document sections used (page numbers + relevance scores)
- 💬 **Chat Interface** — Interactive Q&A with message history, suggested questions, and typing indicators
- 🗂 **Multi-Document Support** — Upload and switch between multiple PDFs

---

## 🏗️ Architecture

```
PDF Upload → PyMuPDF → Semantic Chunks → ChromaDB (all-MiniLM-L6-v2 embeddings)
                                                  ↓
User Question → Embed Query → Similarity Search → Top-5 Chunks
                                                  ↓
                              LLM (OpenRouter) → Grounded Answer + Sources
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.10+ · FastAPI · Uvicorn |
| PDF Parsing | PyMuPDF (fitz) |
| Chunking | LangChain RecursiveCharacterTextSplitter |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 (local) |
| Vector Store | ChromaDB (persistent, local) |
| LLM | Any model via OpenRouter (default: Llama 3.3 8B) |
| Frontend | React 18 · Vite · Vanilla CSS |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Free [OpenRouter](https://openrouter.ai) API key

### 1. Clone & Configure

```bash
git clone https://github.com/your-username/docassist.git
cd docassist
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cd ..
uvicorn backend.main:app --reload
# API running at http://localhost:8000
# Swagger UI at http://localhost:8000/docs
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

---

## 📁 Project Structure

```
docassist/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── config.py                # Settings loaded from .env
│   ├── requirements.txt
│   ├── routers/
│   │   ├── upload.py            # POST /api/upload, GET/DELETE /api/documents
│   │   └── query.py             # POST /api/query (RAG pipeline)
│   ├── services/
│   │   ├── pdf_service.py       # PyMuPDF extraction + semantic chunking
│   │   ├── vector_service.py    # ChromaDB embed / store / search / delete
│   │   └── llm_service.py       # OpenRouter via LangChain ChatOpenAI
│   └── models/
│       └── schemas.py           # Pydantic request/response models
├── frontend/
│   ├── index.html
│   ├── vite.config.js           # Dev server with /api proxy to :8000
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── services/api.js      # Axios client (upload, query, list, delete)
│       └── components/
│           ├── UploadSection.jsx
│           ├── ChatInterface.jsx
│           ├── MessageBubble.jsx
│           ├── SourceCard.jsx
│           └── Loader.jsx
├── .env.example                 # Copy to .env and fill in your key
├── .gitignore
└── README.md
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload & process a PDF |
| `GET` | `/api/documents` | List all uploaded documents |
| `DELETE` | `/api/documents/{doc_id}` | Delete a document and its vectors |
| `POST` | `/api/query` | Ask a question (RAG pipeline) |
| `GET` | `/health` | Health check |

Full interactive docs at **http://localhost:8000/docs**

---

## 📊 Design Decisions

- **Local embeddings** (`all-MiniLM-L6-v2`) — no API cost, works offline, fast
- **Strict RAG prompt** — LLM is instructed to answer only from retrieved context, minimising hallucinations
- **Cosine similarity** — ChromaDB configured with `hnsw:space: cosine` for semantic matching
- **Chunk overlap** — 100-character overlap prevents context being split at sentence boundaries
- **Per-document collections** — each PDF gets its own ChromaDB collection, enabling clean multi-document support and targeted deletion

---

## ⚙️ Configuration

All settings live in `.env` (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | — | **Required.** Your OpenRouter key |
| `LLM_MODEL` | `meta-llama/llama-3.3-8b-instruct` | Any OpenRouter model ID |
| `MAX_CHUNK_SIZE` | `800` | Characters per chunk |
| `CHUNK_OVERLAP` | `100` | Overlap between chunks |
| `TOP_K_RESULTS` | `5` | Chunks retrieved per query |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | Where ChromaDB stores vectors |

---

*Built with FastAPI · LangChain · ChromaDB · React*
