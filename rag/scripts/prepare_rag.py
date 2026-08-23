from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig") as source:
        return [json.loads(line) for line in source if line.strip()]


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def page_number(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def common_source(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_file": clean_text(row.get("source_file")),
        "source_url": clean_text(row.get("source_url")),
        "page": page_number(row.get("page")),
    }


def prepare_housing(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    targets = {
        "tenure": "housing_tenure_status",
        "deposit": "deposit_preparation",
        "monthly_rent": "monthly_housing_cost",
        "maintenance": "maintenance_and_utilities",
        "housing_burden": "housing_cost_burden",
        "move": "moving_plan",
    }
    result = []
    for index, row in enumerate(rows, start=1):
        category = clean_text(row.get("category"))
        result.append(
            {
                "document_id": f"HOUSING_RAG_{index:04d}",
                "collection": "housing",
                "category": category,
                "diagnostic_target": targets.get(category, "housing_preparation"),
                "item": clean_text(row.get("item")),
                "content": clean_text(row.get("evidence_clean") or row.get("evidence")),
                "authority": "official_statistic",
                "review_status": "needs_review" if row.get("needs_review") else "approved",
                **common_source(row),
            }
        )
    return result


def split_dialogue(text: str) -> tuple[str, str, str]:
    pattern = re.compile(
        r"질문:\s*(.*?)\s*답변:\s*(.*?)(?:\s*후속\s*질문:\s*|\s*후속질문:\s*)(.*)$",
        re.DOTALL,
    )
    matched = pattern.match(text)
    if matched:
        return tuple(clean_text(part) for part in matched.groups())

    question, answer, follow_up = text, "", ""
    if "답변:" in text:
        question, answer = text.split("답변:", 1)
        question = question.removeprefix("질문:")
    if "후속질문:" in answer:
        answer, follow_up = answer.split("후속질문:", 1)
    return clean_text(question), clean_text(answer), clean_text(follow_up)


def prepare_dialogue(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for index, row in enumerate(rows, start=1):
        question, answer, follow_up = split_dialogue(
            clean_text(row.get("evidence_clean") or row.get("evidence"))
        )
        parts = [f"질문: {question}"]
        if answer:
            parts.append(f"참고 상담 답변: {answer}")
        if follow_up:
            parts.append(f"추가 확인 질문: {follow_up}")
        result.append(
            {
                "document_id": f"FINANCE_RAG_{index:06d}",
                "collection": "financial_dialogue",
                "category": clean_text(row.get("category")),
                "diagnostic_target": "financial_consultation",
                "item": clean_text(row.get("category")),
                "service_domain": clean_text(row.get("item")),
                "question": question,
                "answer": answer,
                "follow_up_question": follow_up,
                "content": "\n".join(parts),
                "authority": "consultation_example",
                "safety_note": "실제 사용자 계좌 조회 결과가 아닌 상담 예시",
                "review_status": "approved" if not row.get("needs_review") else "needs_review",
                **common_source(row),
            }
        )
    return result


def prepare_youth(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for index, row in enumerate(rows, start=1):
        result.append(
            {
                "document_id": f"YOUTH_RAG_{index:04d}",
                "collection": "youth_survey",
                "category": clean_text(row.get("category")),
                "diagnostic_target": clean_text(row.get("diagnostic_target")),
                "item": clean_text(row.get("item")),
                "content": clean_text(row.get("evidence_clean") or row.get("evidence")),
                "authority": "official_statistic",
                "review_status": "needs_review" if row.get("needs_review") else "approved",
                **common_source(row),
            }
        )
    return result


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as target:
        for row in rows:
            target.write(json.dumps(row, ensure_ascii=False) + "\n")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate(rows: list[dict[str, Any]]) -> None:
    required = {
        "document_id",
        "collection",
        "category",
        "diagnostic_target",
        "item",
        "content",
        "source_file",
        "source_url",
    }
    ids = [row["document_id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("통합 자료에 중복 document_id가 있습니다.")
    for position, row in enumerate(rows, start=1):
        missing = [field for field in required if not row.get(field)]
        if missing:
            raise ValueError(f"{position}번째 문서의 필수 필드가 비어 있습니다: {missing}")


def main() -> None:
    downloads = Path.home() / "Downloads"
    parser = argparse.ArgumentParser(description="FINDEPENDENCE RAG 자료 정제 및 통합")
    parser.add_argument("--housing", type=Path, default=downloads / "housing_rag_final.jsonl")
    parser.add_argument("--dialogue", type=Path, default=downloads / "dialogue_sft.jsonl")
    parser.add_argument("--youth", type=Path, default=downloads / "youth_survey (1).jsonl")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parents[1] / "data")
    args = parser.parse_args()

    housing = prepare_housing(read_jsonl(args.housing))
    dialogue = prepare_dialogue(read_jsonl(args.dialogue))
    youth = prepare_youth(read_jsonl(args.youth))
    combined = housing + dialogue + youth
    validate(combined)

    outputs = {
        "housing_rag_cleaned.jsonl": housing,
        "financial_dialogue_rag_cleaned.jsonl": dialogue,
        "youth_rag_cleaned.jsonl": youth,
        "rag_documents_final.jsonl": combined,
    }
    for filename, rows in outputs.items():
        write_jsonl(args.output_dir / filename, rows)

    manifest = {
        "total_documents": len(combined),
        "collections": dict(Counter(row["collection"] for row in combined)),
        "review_status": dict(Counter(row["review_status"] for row in combined)),
        "unique_ids": len({row["document_id"] for row in combined}),
        "outputs": {
            filename: {
                "rows": len(rows),
                "sha256": sha256(args.output_dir / filename),
            }
            for filename, rows in outputs.items()
        },
    }
    manifest_path = args.output_dir / "rag_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
