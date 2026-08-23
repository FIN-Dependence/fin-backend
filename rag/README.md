# FINDEPENDENCE Chroma RAG

세 원본 JSONL을 공통 구조로 정제하고, `Qwen/Qwen3-Embedding-0.6B`로 임베딩해 로컬 Chroma에 저장합니다.

## 구성

- `data/housing_rag_cleaned.jsonl`: 주거 공식 근거 80건
- `data/financial_dialogue_rag_cleaned.jsonl`: 금융상담 예시 5,000건
- `data/youth_rag_cleaned.jsonl`: 청년 공식 근거 310건
- `data/rag_documents_final.jsonl`: 위 세 파일을 통합한 5,390건
- `scripts/prepare_rag.py`: 정제·ID 재생성·통합
- `scripts/build_chroma.py`: 임베딩 생성 및 Chroma 저장
- `scripts/query_chroma.py`: 공식 근거 3개와 상담 예시 2개를 균형 검색

## 1. 원본 정제

원본 세 파일이 Windows 다운로드 폴더에 있으면 다음 명령으로 실행합니다.

```powershell
python scripts/prepare_rag.py
```

경로가 다르면 옵션으로 지정합니다.

```powershell
python scripts/prepare_rag.py `
  --housing "D:\data\housing_rag_final.jsonl" `
  --dialogue "D:\data\dialogue_sft.jsonl" `
  --youth "D:\data\youth_survey.jsonl"
```

## 2. Chroma 환경 설치

노트북 CPU에서도 실행할 수 있지만 5,390건 전체 임베딩은 Google Colab GPU 사용을 권장합니다.

```powershell
pip install -r requirements-rag.txt
```

## 3. 시험 DB 생성

먼저 100건으로 파이프라인을 확인합니다.

```powershell
python scripts/build_chroma.py --reset --limit 100
```

정상 확인 후 전체 자료를 저장합니다.

```powershell
python scripts/build_chroma.py --reset
```

DB는 `chroma_db` 폴더에 영구 저장됩니다.

## 4. 검색

```powershell
python scripts/query_chroma.py "월소득 245만원이고 월세 65만원이면 추가로 무엇을 확인해야 하나요?"
```

검색 결과는 공식 통계 3개와 금융상담 예시 2개로 분리됩니다. 금융상담 자료는 실제 계좌 조회 결과가 아닌 상담 예시이므로, LLM 프롬프트에서 개인의 실제 금융정보처럼 단정하지 않도록 제한해야 합니다.
