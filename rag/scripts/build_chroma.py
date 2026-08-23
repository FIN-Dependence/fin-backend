from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer


MODEL_NAME = "Qwen/Qwen3-Embedding-0.6B"
COLLECTION_NAME = "findependence_rag_qwen3_06b"


def read_jsonl(path: Path, limit: int | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as source:
        for line in source:
            if line.strip():
                rows.append(json.loads(line))
                if limit and len(rows) >= limit:
                    break
    return rows


def chroma_metadata(row: dict[str, Any]) -> dict[str, str | int | float | bool]:
    allowed = (
        "collection",
        "category",
        "diagnostic_target",
        "item",
        "source_file",
        "source_url",
        "page",
        "authority",
        "review_status",
        "service_domain",
        "safety_note",
    )
    return {key: row[key] for key in allowed if row.get(key) not in (None, "")}


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="정제된 RAG 자료를 Chroma에 저장")
    parser.add_argument("--input", type=Path, default=root / "data" / "rag_documents_final.jsonl")
    parser.add_argument("--db-path", type=Path, default=root / "chroma_db")
    parser.add_argument("--collection", default=COLLECTION_NAME)
    parser.add_argument("--model", default=MODEL_NAME)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()

    rows = read_jsonl(args.input, args.limit)
    if not rows:
        raise ValueError("Chroma에 넣을 문서가 없습니다.")

    client = chromadb.PersistentClient(path=str(args.db_path))
    existing = {collection.name for collection in client.list_collections()}
    if args.reset and args.collection in existing:
        client.delete_collection(args.collection)

    collection = client.get_or_create_collection(
        name=args.collection,
        metadata={
            "description": "FINDEPENDENCE 청년 금융자립 RAG",
            "embedding_model": args.model,
            "hnsw:space": "cosine",
        },
    )
    model = SentenceTransformer(args.model)

    for start in range(0, len(rows), args.batch_size):
        batch = rows[start : start + args.batch_size]
        documents = [row["content"] for row in batch]
        embeddings = model.encode(
            documents,
            batch_size=args.batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()
        collection.upsert(
            ids=[row["document_id"] for row in batch],
            documents=documents,
            embeddings=embeddings,
            metadatas=[chroma_metadata(row) for row in batch],
        )
        print(f"{min(start + len(batch), len(rows))}/{len(rows)} 저장 완료")

    print(f"Chroma 경로: {args.db_path.resolve()}")
    print(f"컬렉션: {args.collection}")
    print(f"저장 문서: {collection.count()}")


if __name__ == "__main__":
    main()
