# FINDEPENDENCE

첫 독립을 시작하는 청년의 소득·주거비·고정비·보험·부채·결제·비상자금·가족 지원을 종합해 금융자립 준비 상태와 해결안을 제공하는 AI 웹서비스입니다.

## 구성

- `frontend`: React 기반 로그인·회원가입·설문·챗봇 웹 화면
- `backend`: Java 17 + Spring Boot API 서버
- `rag`: 세 가지 정제 데이터, Chroma 구축·검색 코드

설문의 금액은 화면에서 `만원` 단위로 입력하고 API와 DB에는 `원` 단위 정수로 저장합니다.
식비·교통비·통신비·별도 공과금·이사비·가구가전비를 분리해 RAG 상담의 개인 입력 근거로 사용합니다.

## 로컬 실행

### MySQL

Docker Desktop이 있으면 프로젝트 루트에서 다음 명령으로 공통 개발 DB를 실행합니다.

```powershell
docker compose up -d mysql
```

기본 DB는 기존 MySQL과의 충돌을 피하기 위해 `localhost:3307/findependence`, 사용자 `findependence`입니다. 컨테이너 내부에서는 기본 MySQL 포트 3306을 사용합니다. 팀원이 각자 실행한 `localhost` DB는 서로 다른 DB이므로, 통합 배포 때는 한 개의 원격 MySQL 접속정보를 `DATABASE_*` 환경변수로 공유합니다.

### 프론트엔드

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

기본 주소는 `http://localhost:3000`입니다. Node.js 20.19 이상이 필요합니다.

### 백엔드

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

기본 주소는 `http://localhost:8080`입니다.

먼저 웹에서 회원가입하면 설문 화면으로 들어갑니다. 저장한 설문과 최근 상담은 같은 계정으로 다시 로그인해 불러올 수 있습니다.

인증 구조·실행·배포 전 체크리스트는 [AUTH_SETUP.md](AUTH_SETUP.md)를 확인하세요.

### 답변 생성 LLM

답변 생성은 Gemini의 OpenAI 호환 API를 사용합니다. `LLM_ENABLED=true`와 `LLM_API_KEY`를 실행 환경에 설정하며 실제 키는 저장소에 올리지 않습니다. 임베딩과 Chroma 검색은 Gemini와 분리된 로컬 RAG 작업입니다.

## RAG

Chroma DB 생성 및 Colab 실행 방법은 `rag/README.md`와 `rag/COLAB_실행순서.md`에 정리되어 있습니다. 현재 5,390건 스냅샷은 `rag/chroma_db`에 포함되어 clone 직후 사용할 수 있습니다. 이후 DB 갱신본은 저장소가 불필요하게 커지는 것을 막기 위해 `package_chroma.py`로 ZIP을 만들고 GitHub Release로 배포하는 방식을 권장합니다.

Qwen3-Embedding-0.6B는 JSONL 근거를 벡터로 만드는 임베딩 모델이고 Chroma는 그 벡터를 저장·검색하는 DB입니다. 질문이 들어오면 FastAPI가 Chroma에서 관련 근거를 찾고, Java 백엔드가 로그인 사용자의 설문·계산 결과·근거를 합쳐 Gemini에 전달합니다.

## AWS 배포

AWS 배포 파일은 `deploy/aws`에 있습니다. EC2 한 대에서 HTTPS 프록시, React 웹, Spring Boot API, RAG, MySQL을 Docker Compose로 실행하며 비밀값은 Git에 포함하지 않습니다. 계정 준비와 배포 순서는 `deploy/aws/README.md`를 따릅니다.
