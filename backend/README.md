# FINDEPENDENCE Java API

설문 저장·수정, 금융자립 진단, 채팅 이력, OpenAI 호환 LLM 연결을 담당하는 Spring Boot API입니다.

## 제공 API

| 기능 | 메서드와 경로 |
| --- | --- |
| CSRF 발급 | `GET /api/auth/csrf` |
| 회원가입 / 로그인 | `POST /api/auth/register`, `POST /api/auth/login` |
| 계정 확인 / 로그아웃 | `GET /api/auth/me`, `POST /api/auth/logout` |
| 금융환경 저장·수정 | `PUT /api/profiles/me` |
| 금융환경 조회 | `GET /api/profiles/me` |
| 금융환경 삭제 | `DELETE /api/profiles/me` |
| 계산 기반 진단 | `GET /api/diagnoses/me` |
| AI 상담 | `POST /api/chat` |
| 최근 상담 50개 | `GET /api/chat/history` |

개인 API는 검증된 JWT의 사용자 ID만 사용합니다. 요청의 `clientId`로 다른 사용자를 선택할 수 없습니다. 예전 익명 설문은 소유자를 입증할 수 없어 자동 이관하지 않습니다.

JWT는 HS256 서명·발급자·대상·만료를 검사하고 HttpOnly, SameSite=Lax, Path=/api 쿠키로 전송합니다. 기본 30분 후 재로그인합니다. 서버의 auth_sessions에서 로그아웃한 토큰을 즉시 무효화하고 비밀번호는 BCrypt로 해싱합니다.

쓰기 요청 전에 `/api/auth/csrf`의 token을 headerName 헤더에 넣고 쿠키와 함께 보내야 합니다. 로그인·회원가입 후 CSRF 토큰을 다시 받습니다. 프론트 API 모듈이 자동 처리합니다. 참고: [Spring Security CSRF](https://docs.spring.io/spring-security/reference/7.0/servlet/exploits/csrf.html), [JWT 검증](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html).

검증 항목: 회원가입 이메일 형식·중복·254자 제한, 별명 2~40자, 가입 비밀번호 8~17자(대문자·숫자·허용 특수문자 포함) 및 UTF-8 72바이트 제한, 비밀번호 확인 일치, 설문 나이 19~39세, 금액 0~1조원 정수, 선택 항목 허용값, 질문 최대 1,500자. 금액 누락은 null로 유지합니다. 인증 요청은 단일 서버 기준 IP당 15분/15회로 제한합니다.

## 실행

Windows에서 프로젝트에 포함된 Maven Wrapper로 실행합니다.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

기본 DB는 MySQL이며 API 주소는 `http://localhost:8080`입니다. 프로젝트 루트에서 `docker compose up -d mysql`을 먼저 실행하거나 `.env.example`의 `DATABASE_*`를 실제 MySQL 접속정보로 설정합니다. H2는 자동화 테스트에서만 사용합니다.

서버를 실행한 상태에서 전체 흐름을 확인하려면 다음을 실행합니다.

```powershell
node scripts/auth-smoke-test.mjs http://localhost:8080
```

`LLM_ENABLED=true`, `LLM_API_KEY`, Gemini OpenAI 호환 `LLM_BASE_URL`을 설정하면 `/chat/completions`를 호출합니다. API가 꺼져 있거나 응답하지 않으면 계산 규칙에 기반한 한국어 답변으로 자동 전환됩니다.

팀 통합 환경에서는 한 개의 원격 MySQL 접속정보를 `.env.example`과 같은 `DATABASE_*` 배포 환경 변수로 설정합니다. 비밀번호가 들어간 실제 `.env` 파일은 Git에 올리지 않습니다.

RAG는 `rag/server.py`의 FastAPI 검색 서버가 Chroma DB를 조회하고, Java `RagContextService`가 `RAG_SEARCH_URL`의 `/search`를 호출하는 구조입니다. `RAG_ENABLED=true`일 때 공식 근거와 상담 예시를 구분해 Gemini 프롬프트에 전달합니다.
