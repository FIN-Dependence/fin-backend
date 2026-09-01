from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import chromadb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))

from build_chroma import COLLECTION_NAME, MODEL_NAME, MODEL_REVISION  # noqa: E402
from query_chroma import search as run_search  # noqa: E402

DB_PATH = Path(os.environ.get("RAG_DB_PATH", str(ROOT / "chroma_db")))
COLLECTION = os.environ.get("RAG_COLLECTION", COLLECTION_NAME)
MODEL_ID = os.environ.get("RAG_MODEL_NAME", MODEL_NAME)
MODEL_REVISION_ID = os.environ.get("RAG_MODEL_REVISION", MODEL_REVISION)
DEFAULT_OFFICIAL_RESULTS = int(os.environ.get("RAG_OFFICIAL_RESULTS", "3"))
DEFAULT_DIALOGUE_RESULTS = int(os.environ.get("RAG_DIALOGUE_RESULTS", "2"))

state: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not DB_PATH.exists():
        raise RuntimeError(
            f"Chroma DB가 없습니다: {DB_PATH}. 먼저 build_chroma.py를 실행하세요."
        )
    client = chromadb.PersistentClient(path=str(DB_PATH))
    state["collection"] = client.get_collection(COLLECTION)
    state["model"] = SentenceTransformer(MODEL_ID, revision=MODEL_REVISION_ID)
    yield
    state.clear()


app = FastAPI(title="FINDEPENDENCE RAG Search API", lifespan=lifespan)


class SearchRequest(BaseModel):
    question: str = Field(min_length=1)
    official_results: int = Field(default=DEFAULT_OFFICIAL_RESULTS, ge=0, le=20)
    dialogue_results: int = Field(default=DEFAULT_DIALOGUE_RESULTS, ge=0, le=20)


class SearchResult(BaseModel):
    document_id: str
    distance: float
    content: str
    metadata: dict[str, Any]


class SearchResponse(BaseModel):
    question: str
    official_evidence: list[SearchResult]
    dialogue_examples: list[SearchResult]


@app.get("/health")
def health() -> dict[str, Any]:
    ready = "collection" in state and "model" in state
    if not ready:
        raise HTTPException(status_code=503, detail="모델/DB가 아직 준비되지 않았습니다.")
    return {"status": "ok", "document_count": state["collection"].count()}


@app.post("/search", response_model=SearchResponse)
def search_endpoint(request: SearchRequest) -> SearchResponse:
    if "collection" not in state:
        raise HTTPException(status_code=503, detail="서버가 아직 준비되지 않았습니다.")

    collection = state["collection"]
    model = state["model"]

    official = (
        run_search(collection, model, request.question, ["housing", "youth_survey"], request.official_results)
        if request.official_results > 0
        else []
    )
    dialogue = (
        run_search(collection, model, request.question, ["financial_dialogue"], request.dialogue_results)
        if request.dialogue_results > 0
        else []
    )

    return SearchResponse(
        question=request.question,
        official_evidence=official,
        dialogue_examples=dialogue,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))

