from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer

from build_chroma import COLLECTION_NAME, MODEL_NAME


QUERY_INSTRUCTION = (
    "Instruct: Retrieve reliable Korean evidence for diagnosing a young adult's "
    "financial readiness for independent living\nQuery:"
)


def search(
    collection: Any,
    model: SentenceTransformer,
    question: str,
    collections: list[str],
    count: int,
) -> list[dict[str, Any]]:
    query_text = f"{QUERY_INSTRUCTION}{question}"
    query_embedding = model.encode(
        [query_text], normalize_embeddings=True, show_progress_bar=False
    ).tolist()
    result = collection.query(
        query_embeddings=query_embedding,
        n_results=count,
        where={"collection": {"$in": collections}},
        include=["documents", "metadatas", "distances"],
    )
    rows = []
    for document_id, document, metadata, distance in zip(
        result["ids"][0],
        result["documents"][0],
        result["metadatas"][0],
        result["distances"][0],
    ):
        rows.append(
            {
                "document_id": document_id,
                "distance": round(float(distance), 6),
                "content": document,
                "metadata": metadata,
            }
        )
    return rows


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Chroma 균형 RAG 검색")
    parser.add_argument("question")
    parser.add_argument("--db-path", type=Path, default=root / "chroma_db")
    parser.add_argument("--collection", default=COLLECTION_NAME)
    parser.add_argument("--model", default=MODEL_NAME)
    parser.add_argument("--official-results", type=int, default=3)
    parser.add_argument("--dialogue-results", type=int, default=2)
    args = parser.parse_args()

    client = chromadb.PersistentClient(path=str(args.db_path))
    collection = client.get_collection(args.collection)
    model = SentenceTransformer(args.model)

    official = search(
        collection,
        model,
        args.question,
        ["housing", "youth_survey"],
        args.official_results,
    )
    dialogue = search(
        collection,
        model,
        args.question,
        ["financial_dialogue"],
        args.dialogue_results,
    )
    print(
        json.dumps(
            {"question": args.question, "official_evidence": official, "dialogue_examples": dialogue},
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
