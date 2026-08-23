# FINDEPENDENCE

첫 독립을 시작하는 청년의 소득·주거비·고정비·보험·부채·결제·비상자금·가족 지원을 종합해 금융자립 준비 상태와 해결안을 제공하는 AI 웹서비스입니다.

## 구성

- `frontend`: React 기반 설문·챗봇 웹 화면
- `backend`: Java 17 + Spring Boot API 서버
- `rag`: 세 가지 정제 데이터, Chroma 구축·검색 코드

## 로컬 실행

### 프론트엔드

```powershell
cd frontend
npm install
npm run dev
```

기본 주소는 `http://localhost:3000`입니다. Node.js 22.13 이상이 필요합니다.

### 백엔드

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

기본 주소는 `http://localhost:8080`입니다.

### 로컬 LLM

LM Studio에서 OpenAI 호환 API 서버를 `http://localhost:1234`로 실행합니다. 세부 환경 변수는 각 폴더의 `.env.example`을 참고하세요.

## RAG

Chroma DB 생성 및 Colab 실행 방법은 `rag/README.md`와 `rag/COLAB_실행순서.md`에 정리되어 있습니다. 생성되는 `rag/chroma_db`는 저장소에 커밋하지 않습니다.
