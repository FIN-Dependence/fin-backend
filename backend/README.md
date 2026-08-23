# FINDEPENDENCE Java API

설문 저장·수정, 금융자립 진단, 채팅 이력, OpenAI 호환 LLM 연결을 담당하는 Spring Boot API입니다.

## 제공 API

| 기능 | 메서드와 경로 |
| --- | --- |
| 금융환경 저장·수정 | `PUT /api/profiles/{clientId}` |
| 금융환경 조회 | `GET /api/profiles/{clientId}` |
| 금융환경 삭제 | `DELETE /api/profiles/{clientId}` |
| 계산 기반 진단 | `GET /api/diagnoses/{clientId}` |
| AI 상담 | `POST /api/chat` |

`clientId`는 프론트가 브라우저별 UUID를 만들어 보냅니다. 실제 서비스에서 로그인 기능을 도입하면 사용자 계정 ID로 교체하세요.

## 실행

Windows에서 프로젝트에 포함된 Maven Wrapper로 실행합니다.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

기본값은 별도 설치가 필요 없는 파일형 H2 DB이며 API 주소는 `http://localhost:8080`입니다.

서버를 실행한 상태에서 전체 흐름을 확인하려면 다음을 실행합니다.

```powershell
.\scripts\smoke-test.ps1
```

LM Studio에서 모델을 로드하고 Local Server를 켠 뒤 `LLM_ENABLED=true`로 실행하면 `/v1/chat/completions`를 호출합니다. 모델 서버가 꺼졌거나 응답하지 않으면 계산 규칙에 기반한 한국어 답변으로 자동 전환됩니다.

PostgreSQL 또는 Supabase를 사용할 때는 `.env.example`의 `DATABASE_*` 값을 배포 환경 변수로 설정합니다. Supabase의 연결 문자열 앞에는 `jdbc:`를 붙여야 합니다.

현재 RAG는 합쳐진 JSONL 파일을 키워드 검색하는 MVP 구현입니다. `RAG_ENABLED=true`와 `RAG_DATA_PATH`를 지정하면 근거 문장을 프롬프트에 넣고 출처를 응답합니다. 다음 단계에서는 같은 `RagContextService`를 pgvector 검색 구현으로 교체하면 됩니다.
