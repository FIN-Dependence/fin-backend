# FINDEPENDENCE 3번 담당 데이터 전처리

## 1. 원자료 다운로드

다음 파일을 내려받아 `data/raw/`에 넣습니다. 파일명은 조금 달라도 스크립트가 핵심 단어로 자동 탐색합니다.

### 2025년 가계동향조사

- 공식 페이지: https://www.mods.go.kr/board.es?act=view&bid=214&list_no=443727&mid=a10301010000
- 받을 파일: `(통계표)2025년 연간 지출 가계동향조사 결과 통계표.xlsx`
- 직접 다운로드: https://www.mods.go.kr/boardDownload.es?bid=214&list_no=443727&seq=4

### 2024년 주거실태조사

- 공식 페이지: https://stat.molit.go.kr/portal/cate/statMetaView.do?hRsId=327
- 받을 파일:
  - `2024년 주거실태조사_코드북.xlsx`
  - `2024년도 주거실태조사_요약보고서.pdf`
  - `2024년도 주거실태조사_일반가구_연구보고서.pdf`

### 2025년 가계금융복지조사

- 공식 페이지: https://mods.go.kr/board.es?act=view&bid=215&list_no=439535&mid=a10301010000
- 받을 파일: `2025년 가계금융복지조사 부록 통계표.xlsx`
- 직접 다운로드: https://mods.go.kr/boardDownload.es?bid=215&list_no=439535&seq=8

## 2. 환경 구성

Windows PowerShell에서 프로젝트 폴더로 이동한 뒤 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\setup_windows.ps1
```

권장 버전은 Python 3.11입니다. 세 명 모두 같은 `requirements-data.txt`를 사용합니다.

모델 학습 환경은 노트북에 설치하지 않고 Google Colab에서만 `requirements-train-colab.txt`를 사용합니다. Intel Xe 노트북에서는 전처리·검수·LM Studio 추론만 수행합니다.

## 3. 전처리 실행

```powershell
.\.venv\Scripts\python.exe scripts\preprocess_owner3.py
```

생성 파일:

- `data/processed/cost_reference.csv`
- `data/processed/housing_scenarios.jsonl`
- `data/processed/validation_rules.json`
- `data/processed/preprocessing_manifest.json`

## 4. 사람 검수 항목

자동 추출 결과의 `needs_review`는 기본적으로 `true`입니다. 다음을 원본 표와 대조한 뒤에만 `false`로 바꿉니다.

1. 금액 단위가 원·천원·만원 중 무엇인지
2. 월평균인지 연간인지
3. 전체 가구인지 1인 가구인지
4. 청년 또는 가구주 연령 구간이 무엇인지
5. 평균·중앙값·비율 중 어떤 통계인지

통계 평균은 개인 위험판정의 임계값으로 사용하지 않습니다. 생활비 항목의 존재 여부와 현실적인 범위, 합성 페르소나의 상식적인 조합을 검토하는 근거로만 사용합니다.

## 5. GitHub 협업 규칙

- 원본 대용량 파일은 Git에 올리지 않습니다.
- `data/raw/`는 각자 로컬에 보관합니다.
- 전처리 코드, 설정 파일, 작은 최종 산출물만 커밋합니다.
- 브랜치 예시: `data/owner3-cost-housing`
- 커밋 예시: `data: 가계동향·주거실태 전처리 추가`
