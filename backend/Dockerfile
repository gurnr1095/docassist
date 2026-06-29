FROM python:3.11-slim

# Non-root user for security
RUN addgroup --system docassist && adduser --system --ingroup docassist docassist

WORKDIR /app

# Install deps first so this layer is cached when only source changes
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Redirect HuggingFace / sentence-transformers caches into /app/.cache
# so the pre-downloaded model lands somewhere the non-root user can read
ENV HF_HOME=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence_transformers \
    TRANSFORMERS_CACHE=/app/.cache/huggingface

# Pre-download the embedding model so first startup is instant
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy source
COPY backend/ ./backend/

# Create data dirs and fix ownership for non-root user (covers .cache too)
RUN mkdir -p /app/uploads /app/chroma_db && \
    chown -R docassist:docassist /app

USER docassist

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UPLOAD_DIR=/app/uploads \
    CHROMA_PERSIST_DIR=/app/chroma_db

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
