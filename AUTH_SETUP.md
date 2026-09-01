# 로그인 기능 실행 안내

수정본 위치: `C:\Users\sunsu\Desktop\FIN-DEPENDENCE\fin-backend`

## 로컬 관리자 계정

저장소에는 기본 관리자 비밀번호를 두지 않습니다. 로컬에서 관리자가 필요할 때만
`ADMIN_SEED_ENABLED=true`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`를 실행 환경이나 Git에서
제외된 `.env`에 설정하세요. 운영 환경에서는 자동 생성을 끄고 별도 계정 관리 절차를 사용합니다.
회원가입 비밀번호는 8~17자로, 영문 대문자·숫자·허용 특수문자(`!@#$%^&*_-`)를 각각 하나 이상 포함해야 합니다.
따옴표·세미콜론·백틱·슬래시는 허용하지 않으며 계정 조회에는 JPA 매개변수 바인딩을 사용합니다.

## 실행

기존 서버를 실행 중이라면 각 PowerShell에서 Ctrl+C로 종료하고 **이 바탕화면 폴더**에서 다시 실행합니다. Documents 폴더의 예전 복사본은 변경하지 않았습니다.

백엔드:

```powershell
cd "C:\Users\sunsu\Desktop\FIN-DEPENDENCE\fin-backend\backend"
.\mvnw.cmd spring-boot:run
```

별도 PowerShell의 프론트:

```powershell
cd "C:\Users\sunsu\Desktop\FIN-DEPENDENCE\fin-backend\frontend"
npm.cmd ci
npm.cmd run dev
```

`http://localhost:3000`에서 회원가입 → 설문 저장 → 상담 → 로그아웃 → 같은 계정으로 로그인 순으로 확인합니다. `localhost`와 `127.0.0.1`을 섞지 마세요. 다른 포트를 쓰면 프론트의 NEXT_PUBLIC_API_BASE_URL과 백엔드의 CORS_ALLOWED_ORIGINS를 맞춰야 합니다.

## 구현된 것

- 로그인·회원가입·로그아웃, 새로고침 시 로그인 상태 복원, 다른 탭의 계정 전환 반영.
- JWT HttpOnly 쿠키, 30분 만료, 서명/issuer/audience/만료 검사, 로그아웃 시 서버 세션 폐기.
- BCrypt 비밀번호 해시, CSRF 검증, 허용된 Origin만 CORS 쿠키 요청 허용, 인증 요청 속도 제한.
- 로그인 계정 기준 설문·진단·상담 격리. 다른 계정 ID를 요청에 넣어도 접근 불가.
- 서버 저장 실패 시 성공으로 표시하지 않음. JWT와 개인 금융정보를 localStorage에 새로 저장하지 않음.
- 기존 익명 데이터는 보존하되 자동 이관하지 않음. 검증 없이 기존 기기 정보를 새 계정에 연결하지 않음.

## 테스트

Java 통합 테스트: `backend`에서 `.\mvnw.cmd test`.
HTTP 테스트: 테스트 서버 실행 후 `node scripts/auth-smoke-test.mjs http://localhost:8080` (Node 22 이상).
HTTP 테스트는 가상 계정 2개를 만듭니다. 별도 메모리 DB(`DATABASE_URL=jdbc:h2:mem:auth-smoke`)로 실행하는 편이 좋습니다.
프론트: `npm.cmd test`, `npx.cmd tsc --noEmit --incremental false`.

### 이번 확인 결과 (2026-08-28)

- 실제 HTTP 인증·입력검증·사용자 격리 확인 24개 통과.
- Java 통합 테스트 12개 통과 (실패·오류 0).
- 프론트 빌드, 렌더링 테스트 2개, TypeScript 검사, 변경한 컴포넌트 ESLint 통과.
- 자동 작업 환경의 Java 파일 경로 접근 문제로 일반 Maven testCompile은 실패했습니다. 같은 소스 전체를 javac로 함께 컴파일한 뒤 `mvnw.cmd surefire:test`로 12개를 실행했습니다. 테스트를 생략하고 통과 처리하지 않았습니다.
- 시연용 로컬 서버는 기존 서버와 겹치지 않도록 프론트 3001 / API 8081로 실행했습니다. HTTP 테스트가 만든 가상 계정 2개는 로컬 DB에만 있으며 실제 사용자 정보는 사용하지 않았습니다.

## 공개 배포 전 필수

현재는 로컬 MVP입니다. 이 작업에서 GitHub push나 공개 배포는 하지 않았습니다.

1. Spring Boot 3.1.5 / JDK 17.0.2 등 기존 런타임은 오래된 버전이므로 지원 중인 보안 패치 버전으로 업그레이드하고 회귀 테스트해야 합니다.
2. HTTPS와 `SPRING_PROFILES_ACTIVE=prod`를 사용하고 안전하게 생성한 32바이트 이상의 `JWT_SECRET`을 비밀 환경변수에 보관하세요. 코드/저장소에 넣지 마세요. prod는 Secure 쿠키를 강제하고 키가 없으면 실행하지 않습니다.
3. 프론트와 API를 같은 사이트(가급적 `/api` 역방향 프록시)로 배포하세요. 완전히 다른 도메인은 현재 SameSite=Lax 쿠키 구성으로 지원하지 않습니다.
4. CORS_ALLOWED_ORIGINS는 실제 프론트 주소로 한정하고 DB 접근 제한·백업·민감정보 보관/삭제 정책을 마련하세요.
5. 현재 속도 제한은 서버 메모리 기준입니다. 여러 서버를 운영할 때는 공유 저장소/프록시 제한으로 바꾸세요.
6. 이메일 소유권 인증·비밀번호 재설정·MFA는 아직 없습니다. 공개 가입을 열기 전에 별도로 구현하세요.
7. RAG/LLM 연동 상태는 기존 설정을 따릅니다. 로그인 추가가 학습 완료나 답변 품질 검증을 의미하지 않습니다.

`.env.example`은 문서용이며 Java가 자동으로 읽지 않습니다. PowerShell의 `$env:변수명` 또는 배포 서비스 설정을 사용하세요. 로컬 기본값은 재시작마다 임시 JWT 키를 생성하므로 서버 재시작 후 다시 로그인해야 합니다.
