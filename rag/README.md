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

Python 3.11 가상환경을 권장합니다. 최초 실행에서는 약 1.2GB인 임베딩 모델을 내려받습니다.
이후에는 Hugging Face 캐시를 재사용합니다.

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
`build_manifest.json`에는 입력 JSONL의 SHA-256, 문서 수, 컬렉션명, 임베딩 모델과
고정 revision이 기록됩니다. 따라서 팀원이 같은 입력과 모델을 사용했는지 확인할 수 있습니다.

## 4. 검색

```powershell
python scripts/query_chroma.py "월소득 245만원이고 월세 65만원이면 추가로 무엇을 확인해야 하나요?"
```

검색 결과는 공식 통계 3개와 금융상담 예시 2개로 분리됩니다. 금융상담 자료는 실제 계좌 조회 결과가 아닌 상담 예시이므로, LLM 프롬프트에서 개인의 실제 금융정보처럼 단정하지 않도록 제한해야 합니다.

## 5. 팀원에게 똑같은 Chroma DB 전달

`chroma_db`는 SQLite·벡터 인덱스가 들어 있는 생성물이므로 일반 Git 커밋에는 넣지 않습니다.
한 사람이 전체 DB를 생성한 뒤 다음 명령으로 공유 ZIP과 SHA-256 파일을 만듭니다.

```powershell
python scripts/package_chroma.py
```

생성 위치:

```text
rag/dist/findependence-chroma-<입력해시>.zip
rag/dist/findependence-chroma-<입력해시>.zip.sha256
```

두 파일은 GitHub 저장소의 **Releases → Draft a new release**에 첨부합니다. DB를 갱신할 때마다
새 버전의 Release를 만들면 Git 이력이 거대한 바이너리로 누적되지 않습니다.

팀원은 Release의 ZIP과 SHA-256 값을 받은 뒤 다음처럼 설치합니다.

```powershell
python scripts/install_chroma_snapshot.py `
  "C:\Users\사용자\Downloads\findependence-chroma-xxxx.zip" `
  --sha256 "sha256파일의 첫 번째 값"
```

그 결과 `rag/chroma_db`가 생성되며 곧바로 `query_chroma.py`를 실행할 수 있습니다.
기존 DB를 교체할 때만 `--replace`를 추가합니다.

### 직접 재생성하는 방법

Release를 받지 않아도 저장소에 포함된 동일한 5,390건 JSONL과 고정된 Qwen 모델 revision으로
각 컴퓨터에서 재생성할 수 있습니다.

```powershell
pip install -r requirements-rag.txt
python scripts/build_chroma.py --reset
python scripts/query_chroma.py "독립 후 누락될 수 있는 비용을 알려줘"
```

공유 ZIP 방식은 DB 파일까지 동일하고, 직접 재생성 방식은 문서·ID·모델 조건이 동일합니다.
여러 사용자가 인터넷을 통해 하나의 실시간 DB를 동시에 조회해야 한다면 파일 공유가 아니라
별도 Chroma 서버 또는 관리형 벡터 DB를 배포해야 합니다.
