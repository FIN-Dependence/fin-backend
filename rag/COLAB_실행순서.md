# Colab에서 Chroma DB 만들기

Google Drive의 `MyDrive/FINDEPENDENCE/rag`에 이 `rag` 폴더를 그대로 올린 뒤 실행합니다.

## 1. GPU 런타임 확인

Colab 메뉴에서 `런타임 → 런타임 유형 변경 → T4 GPU`를 선택합니다.

## 2. Drive 연결

```python
from google.colab import drive
drive.mount('/content/drive')

from pathlib import Path
RAG_ROOT = Path('/content/drive/MyDrive/FINDEPENDENCE/rag')
print('RAG 폴더:', RAG_ROOT.exists())
```

`RAG 폴더: True`가 나와야 합니다.

## 3. 라이브러리 설치

```python
!pip -q install -r "/content/drive/MyDrive/FINDEPENDENCE/rag/requirements-rag.txt"
```

설치 후 런타임 재시작 안내가 나오면 재시작하고 2단계를 다시 실행합니다.

## 4. 100건 시험 DB 생성

```python
!python "/content/drive/MyDrive/FINDEPENDENCE/rag/scripts/build_chroma.py" --reset --limit 100
```

마지막에 `저장 문서: 100`이 나오면 정상입니다.

## 5. 전체 DB 생성

```python
!python "/content/drive/MyDrive/FINDEPENDENCE/rag/scripts/build_chroma.py" --reset
```

완료 후 Drive의 `FINDEPENDENCE/rag/chroma_db`에 Chroma DB가 저장됩니다.

## 6. 검색 확인

```python
!python "/content/drive/MyDrive/FINDEPENDENCE/rag/scripts/query_chroma.py" "월소득 245만원이고 월세 65만원이면 추가로 무엇을 확인해야 하나요?"
```

출력은 `official_evidence`와 `dialogue_examples`로 나뉩니다.

> 주의: 같은 `chroma_db` 폴더를 여러 Colab 세션에서 동시에 수정하지 마세요. 세 명 중 한 명만 DB를 만들고, 나머지는 완성된 DB를 읽는 방식이 안전합니다.
