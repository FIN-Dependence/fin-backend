FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/opt/huggingface

WORKDIR /app
COPY requirements-rag.txt ./
RUN pip install --no-cache-dir -r requirements-rag.txt
COPY scripts ./scripts
COPY server.py ./
COPY chroma_db ./chroma_db

RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('Qwen/Qwen3-Embedding-0.6B', revision='97b0c614be4d77ee51c0cef4e5f07c00f9eb65b3')"

EXPOSE 8000
HEALTHCHECK --interval=60s --timeout=10s --start-period=180s --retries=5 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5)" || exit 1
CMD ["python", "server.py"]
