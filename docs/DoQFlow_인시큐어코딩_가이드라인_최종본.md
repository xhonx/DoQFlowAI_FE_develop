# DoQFlow 인시큐어 코딩 가이드라인 — 최종본 (필수 26개 + 선택 8-1)

세진의 2026-11-24 「기존기능 (1)」 수정사항과 홍서연의 실제 기능 개발을 통합했다.
기존 최종본에서 코드로 확인했던 사실 보정은 유지했다. **기능 구현·검증 완료와 취약 분기 주입 완료는 다르다.**

> 확정 방향 (2026-11-24)
> - 역할은 **일반 사원(1) / 팀장(2)** 두 가지다. 별도 ADMIN 역할은 추가하지 않는다.
> - 항목별 ON/OFF는 유지한다. 관리자 버튼·DB 대신 **env 목록**으로 설정하고 재시작/재빌드한다.
> - `vulnToggle.on(id)`, `useVulnFlag(id)` 호출 형식 유지. 컴포넌트 밖에서는 `isVulnEnabled(id)` 사용.
> - `/lab` 토글 화면과 `/admin/vuln-flags` API는 제거했다. `/manage`는 **팀장 문서 관리** 화면이다.
> - 신규 기능 기반: 1-4 URL 가져오기·도움말, 1-5 로그인 복귀 검증, 2-2 원본 다운로드, 3-4 팀장 관리.
> - 4-5의 팀장 가입 키 검증은 리드가 정상 기능으로 구현했다. 이후 취약 분기 주입은 P2 담당.
> - 표준 28개 중 1-6 제외, 8-1 선택: **필수 26개 + 선택 1개**. 설정 가능한 ID 수가 곧 구현 완료 수는 아니다.

- 작성: 세진(기존 기능) + 홍서연(신규 기능·기능 개발)
- 기준 문서: 「Web/API 개발보안 Guideline」 2022.03.31 v3.0.0 (문서번호 20220331-V3.0.0)
- 실제 스택: Spring Boot 4.0.9 · Java 17 · 내장 Tomcat 11 · jjwt 0.12.6 / React 19 · Vite · nginx(unprivileged) · MariaDB 10.11

### 대상 레포와 로컬 폴더 구조

프런트·백엔드 기준 코드는 공개 개인 포크에서 확인한다. 팀 내부 실습은 팀이 합의한 비공개 공간에서 진행한다. 팀 공용 작업 레포 URL과 PR 대상을 세진·홍서연이 확정한 뒤 공유한다.

| 로컬 폴더 | 검토 기준 | 브랜치 · 커밋 |
|---|---|---|
| `backend/` | [기능 개발용 공개 포크](https://github.com/xhonx/DoQFlowAI_BE_develop) | `main` (기능 개발 브랜치 통합) |
| `frontend/` | [기능 개발용 공개 포크](https://github.com/xhonx/DoQFlowAI_FE_develop) | `main` (기존 develop 기반 기능 개발 통합) |
| `llm/` | [AI Module 원본](https://github.com/DoQFlowAI/DoQScale_LLM2) | `main` · `ab4530e` |

세 폴더를 `FinalPJT-DoQFlow/` 아래에 나란히 둔다. 본문의 `DoQFlow_AI_Backend`와 `DoQScale_Frontend2`는 원본 이름이다. 약어는 `BE/` = `backend/src/main/java/com/rookies6/DoQFlowAI/`, `BE-res/` = `backend/src/main/resources/`, `FE/` = `frontend/`다.

커밋은 작업자 본인의 GitHub 계정과 연결된 이메일로 작성한다. 기능 기반은 위 개인 포크의 `main`에 통합했다. 팀원은 `main`을 클론해 담당 브랜치를 만든다. 원본 `DoQFlowAI` 조직에는 업로드하지 않는다. 개인 포크의 배포 워크플로는 테스트만 실행하며 원본 GHCR 업로드·EC2 배포는 건너뛴다. 클론 명령과 최초 실행은 `frontend/docs/local-development.md`를 따른다. 팀 공용 실습 레포의 통합 PR 대상은 `develop`으로 확정해 공유한다. 개인 포크 브랜치와 팀 실습 레포의 PR 대상을 혼동하지 않는다.

---

## 0. 로컬 실행 (Docker Compose)

`frontend/`, `backend/`, `llm/ai/`를 같은 상위 폴더에 둔다. 로컬 구성은
`frontend/deploy/docker-compose.local.yml`과 `frontend/Dockerfile.local`에 구현되어 있다.
기존 운영 `docker-compose.yml`과 별도이며 GHCR 이미지 권한 없이 소스로 빌드한다.

1. Docker Desktop의 Linux 엔진을 켠다.
2. `frontend/deploy/.env.local.example`을 같은 폴더의 `.env`로 복사하고 비밀값을 채운다. 기존 `.env`는 덮어쓰지 않는다.
3. `frontend/deploy`에서 실행한다.

```powershell
docker compose --env-file .env -f docker-compose.local.yml config --quiet
docker compose --env-file .env -f docker-compose.local.yml up -d --build
docker compose --env-file .env -f docker-compose.local.yml ps
```

- 화면: `http://localhost:8088`, 직접 백엔드: `http://localhost:18080/api`.
- 백엔드 컨테이너 내부는 8080이다. 호스트 18080은 기존 8080 포트와 충돌을 피한다.
- 프론트·백엔드 포트는 `127.0.0.1`에만 바인딩한다. DB·AI는 호스트 포트를 열지 않는다.
- 로컬 DB 계정은 마이그레이션 권한도 가진다. 운영용 앱/마이그레이션 계정 분리와 구분한다.
- HTTP 로컬 환경에서만 `REFRESH_COOKIE_SECURE=false`. 운영 HTTPS 쿠키 설정으로 복사하지 않는다.
- `AI_BASE_URL=http://ai-module:8000`. `AI_INTERNAL_KEY`(16자 이상)는 같은 값을 BE와 AI에 전달한다.
- `OPENAI_API_KEY`는 AI Module에만 전달한다. 키만 백엔드에 넣어서는 AI가 실행되지 않는다.
- `upload-data`는 BE가 먼저 초기화하고 AI는 읽기 전용으로 공유한다. DB/FAISS 볼륨도 로컬 전용이다.
- 실제 `.env`는 Git에서 제외한다. `.env.local.example`은 값이 비어 있는 예시만 공유한다.
- DB 비밀번호는 최초 볼륨 생성 때 적용된다. `down -v`는 데이터 삭제이므로 재시작 용도로 쓰지 않는다.
- nginx lab 템플릿은 P4·인프라 담당 후속 작업이다. 현재 로컬 구성은 기존 HTTP 보안 헤더를 유지한다.

### env 예시와 적용 시점

```dotenv
# 기본 실행은 development. 실습 분기를 선택할 때만 lab.
APP_MODE=lab
# 켤 항목만 나열. 전부 OFF는 LAB_VULNS= (빈 값).
LAB_VULNS=1-1,1-2,2-1
LOCAL_PORT=8088
BACKEND_PORT=18080
DB_ROOT_PASSWORD=직접_설정
DB_APP_USER=doqflow
DB_APP_PASSWORD=직접_설정
JWT_SECRET=32바이트_이상으로_직접_설정
SIGNUP_KEY_LEAD=팀장가입용_키를_직접_설정
AI_INTERNAL_KEY=16자_이상으로_직접_설정
OPENAI_API_KEY=발급받은_API키
# 정확한 도메인만, 와일드카드 불가. 빈 값이면 URL 가져오기 전부 거절.
URL_IMPORT_ALLOWED_HOSTS=raw.githubusercontent.com
```

환경변수 28개를 만드는 방식이 아니다. `LAB_VULNS` 한 줄에 선택한 ID를 적는다.
Compose가 이 목록을 백엔드 시작 환경과 프론트 빌드 인자로 함께 전달한다.
**미구현 항목은 번호를 넣어도 기능이 생기지 않고, nginx/정적 설정은 이 목록만으로 바뀌지 않는다.**

변경 적용:

```powershell
docker compose --env-file .env -f docker-compose.local.yml up -d --build --force-recreate frontend backend
```

`restart`만으로는 컨테이너 env가 바뀌지 않는다. 개별 실행 시 BE `.env`의 `LAB_VULNS`와 FE `.env`의 `VITE_LAB_VULNS`를 동일하게 맞춘다. BE 프로필은 PowerShell `$env:SPRING_PROFILES_ACTIVE="lab"`처럼 실행 환경변수로 지정하거나, Spring이 읽는 백엔드 `.env`에 `spring.profiles.active=lab`을 적는다.
FE는 `npm run dev:lab` 또는 `npm run build:lab`을 사용한다.
일반 `npm run dev`/`npm run build`에서는 모두 OFF다. BE에 prod/production 프로필이 함께 활성화되면 OFF다.
현재 도움 함수는 설정을 읽는 기반이며, 실제 취약 분기는 팀원들의 후속 작업이다.

자세한 실행 안내: `frontend/docs/local-development.md` (백엔드에도 같은 안내를 제공).

---

## 1. 개요·목적

DoQFlow AI는 3차 프로젝트에서 개발한 사내 문서 버전관리·RAG 질의응답 앱이다. 최종 프로젝트는 이 앱을 기반으로 기능을 보강하고 진단 실습 시나리오를 검토한다. `4-5` 가입 키 미검증은 이번 개발 브랜치에서 서버 검증으로 보강했다. 운영 반영은 리뷰·머지와 별도 배포 검증이 필요하다.

- 운영 기능 개발과 검증은 §2의 배포 기준을 따른다.
- P1~P4의 담당과 머지 담당은 §3, 신규 기능 범위는 Part C에서 확인한다.
- 아래 예시에서 실행 결과가 필요한 항목은 예상값이다. 실제 기동·테스트 결과는 해당 PR에서 기록한다.

## 2. 안전 수칙 (필수)

1. 운영 소스와 배포 대상은 최종 팀이 검토한 `main`으로 관리한다. CI에서 운영 JAR·최종 이미지·프런트 번들에 실습 전용 코드, 설정, 샘플 파일이 포함되지 않는지 검사한다. 운영 Dockerfile은 필요한 nginx 템플릿을 경로별로 복사한다.
2. 팀 실습 환경은 로컬로 한정하고 샘플 데이터와 로컬 전용 자격증명을 사용한다. 실제 `.env`, 키, 운영 주소는 팀의 환경 설정으로 관리한다.
3. 기본 동작과 권한 검증은 운영 배포의 선행 조건이다. `4-5` 팀장 가입 키 없음·불일치·정상에 대한 백엔드 회귀 테스트를 배포 전에 확인한다.
4. 플래그는 BE 시작 시, FE 빌드/개발 서버 시작 시 고정된다. nginx·Spring 설정도 각각 적용·재기동 절차를 따른다.
5. **현재 운영 산출물에서 모든 실습 코드를 제거하는 CI 게이트는 구현 완료로 간주하지 않는다.** `prod`/OFF는 실행 제어이지 코드 삭제가 아니다. 기존 FE Dockerfile은 nginx 폴더 전체를 복사하므로 운영용 템플릿만 복사하는 패키징 개선이 필요하다. AWS 자동 배포는 이번 작업에서 실행하지 않는다.

## 3. 협업·머지 요약

| 오너 | 담당 항목 (이 문서 기준) | 머지 |
|---|---|---|
| P1 백엔드A | 1-2, 1-3, 2-1, 3-1, 3-2 | 홍서연 |
| P2 백엔드B | 3-3, 4-2, 4-5, 5-2, 6-1, 6-2, (8-1) | 홍서연 |
| P3 프론트·공통 | 1-1, 4-1, 4-3, 4-4 | 세진 (백엔드 변경분은 홍서연 cross-review) |
| P4 인프라·공통 | 5-1, 3-5, 3-6, 7-1, 7-2, 7-3, 7-4 | 세진 (`application-lab.yaml`·`LabServerConfig` 등 백엔드 변경분은 홍서연 cross-review) |

- 흐름: 이슈 → 담당자 브랜치 → `develop` PR → 같은 영역 리뷰 → 파트 담당자 머지. P1~P4 실명 배정, 필수 리뷰·CI 조건, 팀 레포의 강제 브랜치 규칙은 팀이 확정해 공유한다. 프런트는 `npm run lint`·`npm run build`, 백엔드는 `mvnw` 테스트 결과를 PR에 기록한다. 코드 예시는 설명용이며, 기준 코드에서 검사한 결과와 신규 구현 후 결과를 구분한다.
- 1 이슈 = 1 취약점 = 1 브랜치. 예) 이슈 `[Vuln] 1-2 SQL Injection 취약 토글 주입`, 브랜치 `vuln/<이슈번호>-1-2-sqli`, 커밋 `vuln: 1-2 SQL Injection 취약 분기 추가`.
- 모든 주입 지점은 아래 형식을 지킨다.

```java
// === [VULN 1-2] guideline:1-2 | owner:P1 | START ===
if (vulnToggle.on("1-2")) {   // 🔴 INSECURE
    // ...취약...
} else {                       // 🟢 SECURE (원본, 현재 코드 그대로)
    // ...안전...
}
// === [VULN 1-2] END ===
```

### 토글 적용 방식 — env 읽기, 호출 형식 유지

| 계층 | 실제 코드 | 설정 / 적용 |
|---|---|---|
| 백엔드 | `BE/lab/VulnToggle.java`, `vulnToggle.on("번호")` | `SPRING_PROFILES_ACTIVE=lab` + `LAB_VULNS`, 시작 시 읽고 고정 |
| 프론트 컴포넌트 | `FE/src/hooks/useVulnFlag.js`, `useVulnFlag(id)` | `VITE_LAB_VULNS`, Vite mode=lab에서만 적용 |
| 프론트 인터셉터 등 | `FE/src/utils/vulnFlags.js`, `isVulnEnabled(id)` | 훅과 같은 고정 값을 읽음. 별도 조회 API 없음 |
| 파서 / 검증 | `FE/src/utils/labFlags.js`, `BE/lab/VulnToggle.java` | 지원하지 않는 ID는 lab 기동 시 오류. 빈 값은 전부 OFF |
| DB | V2 이력 유지, `V3__remove_vuln_flags.sql` | 기존 DB의 Flyway 체크섬 보존 후 사용하지 않는 테이블만 제거 |
| nginx / 정적 파일 | P4의 별도 lab 설정·빌드 구성 | 목록 설정만으로 전환되지 않음. 아직 팀의 후속 구현 대상 |

§3의 START/END 마커와 `if (vulnToggle.on(...))` 형식은 그대로 사용한다.
실시간 버튼·`/lab`·플래그 GET/PATCH API는 구현하지 않는다.
각 함수 안에서 env를 다시 파싱하거나, 프론트에서 온 값을 서버 권한으로 신뢰하지 않는다.
`.env`가 Git ignore 대상인 것은 정상이며 예시 파일만 공유한다. `.env.lab`을 사용할 수 없다는 의미가 아니다.

### 파일별 오너 — 한 파일 한 오너 (중요)

스킬 규칙 "두 명이 같은 파일 금지"를 지키도록 주입 위치를 정했다. 아래 표의 **모든 파일은 오너가 한 명**이다. 각 항목 섹션의 🔴 패턴은 이 표의 위치를 따른다.

| 파일 | 오너 | 들어가는 분기 |
|---|---|---|
| `BE/controller/DocumentController.java` | P1 | 1-2 (`list()`) |
| `BE/dto/request/DocumentListRequest.java` | P1 | 1-2 (`sort` 검증 이동) |
| 신규 `BE/.../DocumentListNativeQuery.java` | P1 | 1-2 (취약 네이티브 쿼리) |
| `BE/service/VersionService.java` | P1 | 1-3 (`getContent(AppUser, …)`) |
| `BE/service/InvitationService.java` | P1 | 1-3 (`respond()`) |
| `BE/service/UploadFileValidator.java` | P1 | 2-1 |
| `BE/dto/request/SignupRequest.java` + 신규 `PasswordPolicyValidator` | P1 | 3-1 (커스텀 제약으로 이동) |
| `BE/service/LoginAttemptService.java` | P1 | 3-2 (`checkLocked()`, `recordFailure()` 내부) |
| `BE/service/AuthService.java` | P2 | 4-2 (`refresh`, `logout`), 4-5 (`signup` — 리드 baseline 후 분기), 6-2 (`login`) |
| `BE/security/JwtProvider.java` | P2 | 4-2 (만료 시간) |
| `BE/security/AccessPolicy.java` | P2 | 4-5 (`writeOrThrow()`) |
| `BE/controller/UserController.java` | P2 | 3-3 (`lookup()`), 5-2 (`me()`) |
| `BE/repository/AppUserRepository.java` | P2 | 3-3 (부분 검색 메서드 추가) |
| `BE/controller/AuthController.java` | P2 | 5-2 (`login()` 응답) |
| `BE/exception/GlobalExceptionHandler.java` | P2 | 6-1 |
| `FE/src/utils/errors.js` | P2 | 6-1 (선택: 서버 문구 그대로 표시) |
| `BE/service/ChatService.java` | P2 | 8-1 |
| `BE/repository/DocumentVersionRepository.java` | P2 | 8-1 (전체 최신 버전 조회 메서드 추가) |
| `BE/service/DocumentService.java` | P3 | 4-3 (`create()`) |
| `BE/security/SecurityConfig.java` | P3 | 1-1 (CORS), 4-3 (캐시 헤더), 4-4 (공개 경로) |
| `BE/security/RefreshTokenCookie.java` | P3 | 1-1 (SameSite), 4-1 (HttpOnly) |
| `BE/controller/VersionController.java` | P3 | 4-4 (무인증 조회 경로) |
| `FE/src/components/common/MarkdownView.jsx` | P3 | 1-1 |
| `FE/src/store/authStore.js`, `FE/src/pages/DashboardPage.jsx` | P3 | 4-1 |
| `FE/src/services/api.js` | P3 | 4-3 (`X-User-Rank` 헤더 부착) |
| 신규 `BE-res/application-lab.yaml` | P4 | 5-1, 7-3, 7-4 |
| 신규 `BE/.../LabServerConfig.java` (`lab` 프로필) | P4 | 7-1 (TRACE), 7-3 (X-Powered-By) |
| 신규 `FE/nginx/lab/default.conf.template` | P4 | 7-1, 7-2, 7-3, 7-4 (CSP 완화 포함 — 1-1 실습의 전제) |
| `FE/index.html` | P4 | 3-5, 5-1 (`<!-- LAB_HEAD -->` 표시 한 줄만 추가) |
| `FE/public/robots.txt` (안전 기준선, 모든 빌드) | P4 | 3-5 |
| 신규 `FE/public-lab/` (lab 모드 전용 정적 파일) | P4 | 3-5, 3-6 |
| 신규 `FE/lab/head.html` | P4 | 3-5, 5-1 (lab 빌드 HTML에만 끼워 넣을 내용) |
| `FE/src/routes/AppRouter.jsx`, `FE/vite.config.js` | P4 | 3-6 (`vite.config.js`는 3-5·3-6·5-1의 lab 전용 설정도 담당) |

- 원칙: **1 항목 = 1 브랜치 = 1 오너**, 그리고 **1 파일 = 1 오너**.
- 손대지 않는 파일: `AccessPolicy.registerOrThrow()`는 `UserController.lookup()`도 쓰므로 4-3을 여기에 넣지 않는다. `CurrentUserResolver`도 수정하지 않는다.
- 공용 env 도우미·프론트 훅, 원본 다운로드, URL 가져오기/도움말, 로그인 복귀 검증, 팀장 관리 화면은 개발 브랜치에 구현했다. 의존 PR은 사용한 커밋과 파일 오너를 명시한다. 4-5 가입 키 baseline은 리드의 `SignupKeyPolicy`를 재사용한다.
- 공유 파일은 기존 오너와 신규 기능 담당자가 PR 순서를 먼저 합의한다. `AppRouter.jsx`는 1-5·3-6, `SecurityConfig.java`는 P3와 신규 관리자 인가 작업, 버전 조회·저장 관련 파일은 P1·P3와 신규 다운로드 작업에 영향을 줄 수 있다.
- 스킬의 "공통 항목(1-1, 4-3, 4-4, 5-1)은 세진 머지 + 백엔드 변경분 홍서연 cross-review"는 그대로 적용한다.

### 제외·담당 외 항목

| 번호 | 처리 |
|---|---|
| 1-6 | 제외 — 기준 문서의 고전적 Buffer Overflow·Format String 사례를 현재 Java·JS 애플리케이션 경로에 직접 매핑하기 어렵다. DTO 길이와 업로드 크기 제한은 기존 기능으로 유지한다. |
| 1-4, 1-5, 2-2, 3-4 | 신규 또는 기존 기능 보강 — 이 문서 Part C 참조 |

---

## 4. 전체 요약표

기준 PDF 28개 중 `1-6`을 제외하고, 기존 기능 22개와 신규·보강 4개를 필수로 다룬다. `8-1`은 선택이므로 전체 적용 범위는 **필수 26개, 선택 포함 27개**다. 별도 토글 관리 화면은 없으며, env의 선택 목록과 구현 완료 개수는 별도로 집계한다.

| 번호 | 항목명 | 준수기준 | 오너 | 대상 위치 (대표) | 코드 확인 상태 |
|---|---|---|---|---|---|
| **Part A — 백엔드** |||||
| 1-2 | 삽입(Injection) 공격 가능성 | 중요 | P1 | `BE/controller/DocumentController.list()`, `BE/dto/request/DocumentListRequest` | 안전 |
| 1-3 | 파라미터 값 및 히든 필드 조작 가능성 | 중요 | P1 | `BE/service/VersionService.getContent()`, `BE/service/InvitationService.respond()` | 안전 |
| 2-1 | 악성코드파일 업로드 | 중요 | P1 | `BE/service/UploadFileValidator.validate()` | 안전 |
| 3-1 | 패스워드 정책 유무 및 반영 여부 | 일반 | P1 | `BE/dto/request/SignupRequest` (+ 신규 `PasswordPolicyValidator`) | 안전 (주기 변경 정책은 없음) |
| 3-2 | 인증 실패 횟수 제한 | 일반 | P1 | `BE/service/LoginAttemptService` | 안전 |
| 3-3 | 계정 정보 파악 가능성 | 일반 | P2 | `BE/controller/UserController.lookup()`, `BE/service/AuthService.signup()` | 일부 노출 (가입 409) |
| 4-2 | 인증(세션 및 토큰) 값 안전성 설정 여부 | 일반 | P2 | `BE/security/JwtProvider`, `BE/service/AuthService` | 안전 |
| 4-3 | 접근제어 우회 가능성 확인 | 일반 | P3 | `BE/service/DocumentService.create()`, `BE/security/SecurityConfig`, `FE/src/pages/DashboardPage.jsx` | 안전 |
| 4-4 | 비인증 상태로 중요 page 접근 가능성 | 일반 | P3 | `BE/security/SecurityConfig`, `BE/controller/VersionController` | 안전 |
| 4-5 | 일반계정 권한 상승 가능성 | 일반 | P2 | `BE/service/AuthService.signup()`, `BE/security/AccessPolicy.writeOrThrow()` | **서버 가입 키 검증 보강 완료** (개발 브랜치) |
| **Part B — 나머지 (프론트·공통·인프라)** |||||
| 1-1 | XSS / CSRF 공격 가능성 | 중요 | P3 | `FE/src/components/common/MarkdownView.jsx`, `BE/security/RefreshTokenCookie` | 안전 (링크 스킴 필터 없음 — 잠재) |
| 4-1 | 쿠키 및 웹 스토리지 조작 가능성 | 일반 | P3 | `FE/src/store/authStore.js`, `BE/security/RefreshTokenCookie` | 메모리 저장과 HttpOnly 확인, Secure는 환경 설정에 따름 |
| 5-1 | 소스코드 내 주요정보 노출 여부 | 일반 | P4 | `BE-res/application.yaml`, `FE/mock/server.js` | 환경변수 사용 확인, 운영 번들 검사 예정 |
| 5-2 | 요청 및 응답 값 내 주요정보 포함여부 | 중요 | P2 | `BE/dto/response/*`, `BE/controller/UserController.me()` | 안전 |
| 6-1 | 오류페이지를 통한 정보 노출 여부 | 일반 | P2 | `BE/exception/GlobalExceptionHandler` | 일반 500 고정 문구, 입력 검증 400은 필드 문구 표시 |
| 6-2 | 일괄적인 오류 처리 페이지 존재 여부 | 일반 | P2 | `BE/service/AuthService.login()`, `BE/exception/ErrorCode` | 일반 로그인 실패 401 통일, 잠금은 423, 응답 시간 미측정 |
| 3-5 | 검색엔진 정보 노출 가능성 | 일반 | P4 | `FE/public/`, nginx | robots.txt 없음 (권고 미반영) |
| 3-6 | 백업 파일 및 테스트 파일 존재 여부 | 일반 | P4 | `FE/src/routes/AppRouter.jsx`, `FE/.dockerignore` | 안전 |
| 7-1 | Client Request Method | 일반 | P4 | `FE/nginx/*/default.conf.template`, `BE/security/SecurityConfig` | CORS 허용 목록 확인, 실제 메서드 응답 미검증 |
| 7-2 | 파일 목록화 가능성 | 일반 | P4 | `FE/nginx/*/default.conf.template` | 안전 |
| 7-3 | 서버 헤더정보 노출 | 일반 | P4 | `FE/nginx/*/default.conf.template` (`server_tokens off`) | 버전 표기 설정 확인, 외부 헤더 응답 미검증 |
| 7-4 | 취약한 보안설정 | 일반 | P4 | nginx TLS·보안 헤더, `FE/k8s/*.yaml`, Dockerfile | HTTPS 템플릿 보유, 실제 배포 설정·응답 확인 필요 |
| 8-1 | 정의되지 않은 취약점 (선택) | - | P2 | `BE/service/ChatService.ask()` | RAG 문서 권한 범위 검증 확인 |
| **Part C — 신규·보강** | | | | | |
| 1-4 | SSRF / File Inclusion | 중요 | 홍서연 | `DocumentImportController`·`HelpController` | 구현 완료, 정상/거절 검증 |
| 1-5 | 검증되지 않은 리다이렉트와 포워드 | 일반 | 홍서연 | `ProtectedRoute.jsx`, `PublicOnlyRoute.jsx` | `safeReturnPath` 검증 보강 완료 |
| 2-2 | 중요 정보 파일 다운로드 | 중요 | 홍서연 | 버전 서비스·파일 저장 경로 | `FileDownloadController` 구현 완료 |
| 3-4 | 관리자 페이지 분리 여부 | 일반 | 홍서연 | 팀장 `/manage` + `/management/documents` | 사원/팀장 유지, 대체 적용 구현 |

---

# Part A — 백엔드 (10개)

## [1-2] 삽입(Injection) 공격 가능성

- **가이드 정의**: SQL Injection 및 Command Injection 등 모든 삽입 공격 취약점. 웹 애플리케이션이 사용자가 입력 가능한 변수를 체크 없이 Database로 전달하면, 정상 Query에 공격자의 Query를 더해 DB 내 정보를 유출·변조할 수 있다. 대응방안은 쿼리 생성 시 입력되는 모든 값의 유효성 검사(특수문자 필터링, 숫자는 숫자만)다.
- **준수기준 / 오너 / 플래그ID**: 중요 / P1 / `"1-2"`
- **대상 위치**
  - `BE/controller/DocumentController.list()` (`@Valid @ModelAttribute DocumentListRequest`) → `BE/service/DocumentService.list()`
  - `BE/dto/request/DocumentListRequest` (`sort` 파라미터, `toPageable()`)
  - `BE/repository/DocumentRepository.findAccessible()`
  - 참고: 이 앱에는 시스템 명령 실행·XPATH·LDAP 기능이 없다. Command Injection 등은 해당 기능 없음.
- **🟢 안전 코드(현재)**: 문서 목록의 `findAccessible()`은 JPQL 바인딩 파라미터를 사용한다. `DocumentListRequest`는 `sort`를 검증하고 정렬 컬럼을 `createdAt`으로 고정한다.

```java
// DocumentListRequest
@Pattern(regexp = "createdAt,(asc|desc)")
String sort

public Pageable toPageable() {
    ...
    Sort.Direction direction = (sort != null && sort.endsWith(",asc"))
            ? Sort.Direction.ASC : Sort.Direction.DESC;
    return PageRequest.of(pageValue, sizeValue, Sort.by(direction, SORT_PROPERTY)); // "createdAt" 고정
}
```

- **🔴 취약 코드 패턴 (토글 on)** — 분기 위치: `DocumentController.list()` (P1)
  - `DocumentListRequest.sort`의 `@Pattern`은 어노테이션이라 런타임에 끌 수 없다. 그래서 `@Pattern`을 지우고, 같은 정규식 검사를 컨트롤러의 안전 분기로 옮긴다. 정규식이 안 맞으면 지금처럼 400 `VALIDATION_ERROR`를 던진다. (지금은 `sort: …` 필드 문구가 나가고 이동 후에는 고정 문구가 나가는 차이만 있다. `sort`를 검사하는 기존 테스트는 없다.)
  - 취약 분기는 `sort` 값을 그대로 이어 붙인 **네이티브 쿼리**를 신규 `DocumentListNativeQuery`(P1)에서 실행한다. `DocumentService`는 건드리지 않는다.

```java
// DocumentController.list()
// === [VULN 1-2] guideline:1-2 | owner:P1 | START ===
if (vulnToggle.on("1-2")) {   // 🔴 INSECURE
    return ApiResponse.ok(documentListNativeQuery.listUnsafe(me, request)); // 내부에서 "... ORDER BY " + request.sort()
} else {                       // 🟢 SECURE (현재 검증·조회 그대로)
    if (request.sort() != null && !request.sort().matches("createdAt,(asc|desc)")) {
        throw new BusinessException(ErrorCode.VALIDATION_ERROR, "invalid sort");
    }
    return ApiResponse.ok(documentService.list(me, request));
}
// === [VULN 1-2] END ===
```

  - 주의: 취약 쿼리도 조회 조건은 지금과 같게(내가 등록한 문서 + 초대 수락한 문서) 두고, **정렬 부분만** 입력값을 그대로 쓴다. 그래야 1-2를 켰을 때 목록 결과가 달라지지 않고 정렬 주입만 실습할 수 있다.

- **PoC(공격 재현)**
  - 정상: `GET /api/documents?sort=createdAt,desc`
  - 불리언 기반: `GET /api/documents?sort=(CASE WHEN (SELECT SUBSTR(email,1,1) FROM app_user WHERE id=1)='a' THEN created_at ELSE name END)` (URL 인코딩해서 보냄) → 정렬 순서 변화로 한 글자씩 추출. 앱 DB 계정은 DML 권한만 있어도 `app_user` 조회가 되므로 성립한다.
  - 오류 유발: `sort=created_at'` → 500 발생 여부 확인 (6-1과 연계하면 DB 오류 메시지 노출)
- **진단 포인트**
  - 자동 진단: 정렬·검색 파라미터에 `'`, `)`, `CASE WHEN`, `SLEEP(5)` 같은 페이로드를 넣고 응답 순서·지연·상태코드 차이를 비교한다.
  - 코드 리뷰: `createNativeQuery`, `+ request.`, `" ORDER BY " +`를 grep한다.

## [1-3] 파라미터 값 및 히든(Hidden) 필드 조작 가능성

- **가이드 정의**: API·웹 애플리케이션에 전달되는 파라미터 값이나 히든 필드를 위·변조해 타인의 게시물·개인정보 열람, 타인의 글 수정 등을 할 수 있는 취약점. 대응방안은 파라미터·URL 값을 신뢰하지 말고, 트랜잭션이 발생하는 부분에서 서버 측 권한 검증을 반드시 수행하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 중요 / P1 / `"1-3"`
- **대상 위치**
  - `BE/controller/VersionController.content()` → `BE/service/VersionService.getContent(AppUser, Long, int)`
  - `BE/controller/InvitationController.accept()` → `BE/service/InvitationService.respond()`
- **🟢 안전 코드(현재)**: 경로의 `documentId`를 믿지 않고 `AccessPolicy.readOrNotFound()`로 읽기 권한을 확인한다. 초대 응답은 그 초대의 대상자가 본인인지 비교한다. 권한 밖과 없는 리소스는 같은 404다(SEC-03).

```java
// VersionService
public VersionContentResponse getContent(AppUser me, Long documentId, int versionNo) {
    return getContent(accessPolicy.readOrNotFound(me.getId(), documentId), versionNo);
}

// InvitationService.respond()
if (!permission.getUser().getId().equals(userId)) {
    throw new DocumentNotFoundException();
}
```

- **🔴 취약 코드 패턴 (토글 on)**
  - `getContent`: `readOrNotFound` 대신 `documentRepository.findById(documentId)`로 문서만 찾고 권한 확인을 생략한다 (IDOR).
  - `respond`: 대상자 비교(`permission.getUser().getId().equals(userId)`)를 건너뛴다. 공격자가 **남의 초대(permissionId)를 본인 뜻과 상관없이 수락·거절**시킬 수 있다. (공격자 자신이 그 문서 열람권을 얻는 것은 아니다 — 초대 대상자는 바뀌지 않는다. 영향은 타인 초대 상태의 무단 변경이다.) 본인 열람권 획득까지 노리는 IDOR는 위 `getContent` 쪽이 대표 사례다.
- **PoC(공격 재현)**
  - 사원 A로 로그인한 뒤, 초대받지 않은 문서 ID를 순회한다: `GET /api/documents/{1..N}/versions/1/content` → 안전 모드는 404, 취약 모드는 200 + 본문.
  - `POST /api/invitations/{B의 PENDING permissionId}/accept` → 취약 모드에서 200. 이후 B의 받은 초대 목록(`GET /api/invitations`)에서 해당 초대가 사라졌는지로 영향을 확인한다.
- **진단 포인트**
  - 두 계정(A, B)으로 같은 요청을 보내 ID만 바꾸고 응답을 비교한다 (Burp Autorize 방식).
  - `documentId`, `versionNo`, `permissionId`는 순차 숫자라 열거가 쉽다는 점을 함께 확인한다.

## [2-1] 악성코드파일 업로드

- **가이드 정의**: 웹 서버에서 실행 가능한 서버 스크립트 파일을 업로드·실행해 원격 명령 실행이나 중요정보 유출이 가능한 취약점. 대응방안은 수용 가능한 확장자 외 모든 업로드를 서버 측에서 금지하고, 대소문자 무시 비교, 이중 확장자(`file.jpg.jsp`)와 확장자 끝 `.` 우회 차단, 파일명의 `../`, `;`, `%0` 같은 특수문자 차단이다.
- **준수기준 / 오너 / 플래그ID**: 중요 / P1 / `"2-1"`
- **대상 위치**
  - `BE/controller/VersionController.upload()` → `BE/service/VersionService.uploadBatch()`
  - `BE/service/UploadFileValidator.validate()`, `extensionOf()`, `startsWith()`, `isPlainUtf8Text()`, `isSafeFilename()`
  - `BE/service/VersionFileStorage.store()`
- **🟢 안전 코드(현재)**
  - 확장자 화이트리스트(txt, md, csv, json, xml, yaml, yml, log, pdf, docx)이고, 마지막 `.` 뒤를 소문자로 비교한다.
  - 내용 검증: pdf·docx는 매직 넘버, 텍스트 계열은 UTF-8 + 제어문자 검사. 브라우저가 보낸 Content-Type은 믿지 않는다.
  - html·svg는 저장형 XSS가 되므로 일부러 제외했다.
  - 경로 형태의 파일명은 거부한다. 저장은 `UUID.확장자`로 하고 nginx 웹 루트와 분리한다.
  - 파일 형식 검증, 저장 후 브라우저 표시, 서버에서의 스크립트 실행은 각각 별도로 판정한다. 현재 저장 코드에서 서버 스크립트를 실행하는 경로는 확인되지 않았다.

```java
FileType type = FileType.fromExtension(extension)
        .filter(t -> allowedExtensions.contains(t.extension))
        .orElseThrow(() -> new UploadValidationException(Reason.INVALID_TYPE));
boolean valid = type.kind == FileKind.DOC ? startsWith(file, type.magic) : isPlainUtf8Text(file);
```

- **🔴 취약 코드 패턴 (토글 on)**
  - 화이트리스트 대신 블랙리스트(`jsp`, `php`, `exe`만 거부, 대소문자 구분)로 바꾼다. `.JSP`, `.html`, `.svg` 등이 통과한다.
  - 매직 넘버·UTF-8 검사를 생략하고 클라이언트 `Content-Type`을 그대로 MIME으로 저장한다.
  - `isSafeFilename()` 검사를 생략한다.
  - 허용 목록에 없는 확장자는 **텍스트 계열(`FileKind.TEXT`)로 취급**해 업로드 트랜잭션에서 본문을 채운다. 그래야 원문 보기 화면에서 내용이 보이고 1-1과 이어진다.
  - 연계: 업로드된 `.html`, `.md` 내용은 1-1(MarkdownView raw HTML 렌더)과 이어서 저장형 XSS 실습에 쓴다.
- **PoC(공격 재현)** — 등록자(팀장) 계정으로 자기 문서에 업로드

```http
POST /api/documents/{내 문서 ID}/versions
Content-Type: multipart/form-data; boundary=X

--X
Content-Disposition: form-data; name="files"; filename="evil.HTML"
Content-Type: text/html

<p>공지</p><img src=x onerror="alert(document.domain)">
--X--
```

  - 안전 모드: 400, 응답 code `VALIDATION_ERROR` (내부 사유 `INVALID_TYPE`). 취약 모드: 201.
  - 1-1까지 켠 상태에서 초대받은 사용자가 이 버전의 원문 보기를 열면 스크립트가 실행된다. (CSP가 없는 환경이어야 한다 — 1-1의 "CSP 전제" 참고)
- **진단 포인트**
  - 확장자 대소문자, 이중 확장자, Content-Type 위조, 매직 넘버 위조(`%PDF` + 스크립트)를 조합해 업로드 결과를 비교한다.
  - 저장 파일이 웹 경로에서 직접 열리는지(실행 가능성)도 확인한다. 현재 구조에서는 서빙 경로가 없으므로, 영향은 XSS 연계로 평가한다.

## [3-1] 패스워드 정책 유무 및 반영 여부

- **가이드 정의**: 패스워드 생성·재생성 시 안전한 규칙이 적용되지 않으면 쉽게 추측되거나 무차별 대입으로 짧은 시간에 획득될 수 있다. 대응방안은 추측 불가능한 패스워드 사용과 정기 변경이다(사용자 권고: 최대 사용기간 60일, 최소 1일, 최근 암호 기억 1회).
- **준수기준 / 오너 / 플래그ID**: 일반 / P1 / `"3-1"`
- **대상 위치**
  - `BE/dto/request/SignupRequest` (`password` 필드 검증 어노테이션)
  - `BE/controller/AuthController.signup()` (`@Valid`로 검증 실행) → `BE/service/AuthService.signup()`
  - `FE/src/pages/SignupPage.jsx` `validate()` (화면 검증. 우회 가능하므로 판정 근거로 쓰지 않음)
- **🟢 안전 코드(현재)**: 8~64자, 영문·숫자·특수문자 중 2종 이상을 서버(Bean Validation)에서 강제한다. 해시는 BCrypt다.

```java
@NotBlank
@Size(min = 8, max = 64)
@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).*$|^(?=.*[A-Za-z])(?=.*[^A-Za-z\\d]).*$|^(?=.*\\d)(?=.*[^A-Za-z\\d]).*$",
         message = "영문·숫자·특수문자 중 2종 이상을 포함해야 합니다.")
String password,
```

  - 참고: 비밀번호 변경 기능이 없어서 가이드의 주기 변경·재사용 금지 정책은 현재 적용 대상이 없다.
- **🔴 취약 코드 패턴 (토글 on)** — 분기 위치: 신규 `PasswordPolicyValidator` (P1). `AuthService`는 건드리지 않는다.
  - 어노테이션은 런타임에 끌 수 없으므로 `password` 필드의 `@Size(min = 8, max = 64)`·`@Pattern`을 커스텀 제약 `@PasswordPolicy`로 바꾼다. 검사는 `PasswordPolicyValidator`(Spring 빈, `VulnToggle` 주입)가 한다.
  - 안전 분기: 지금과 같은 길이(8~64자)·조합 규칙을 검사하고, 같은 문구("영문·숫자·특수문자 중 2종 이상을 포함해야 합니다.")를 낸다. 응답은 지금처럼 400 `VALIDATION_ERROR`, `password: …` 형식이다.
  - 취약 분기: 최소 길이·조합 검사를 하지 않는다. `1234`, `aaaa`, 이메일과 같은 값도 허용한다. **최대 64자 제한은 취약 분기에서도 유지한다.** BCrypt는 72바이트를 넘는 비밀번호에서 예외를 던지므로(Spring Security 6.3+), 최대 길이까지 풀면 3-1이 아니라 500 오류가 재현된다.
- **PoC(공격 재현)**
  - `POST /api/auth/signup` `{"email":"weak@lab.test","password":"1234","name":"weak","rankLevel":1}` → 안전 400 / 취약 201.
  - 이어서 `1234`, `password` 같은 상위 사전 단어로 로그인 대입을 시도한다 (3-2와 연계).
- **진단 포인트**
  - 화면 검증을 우회하고 API를 직접 호출해서 짧은·단순·이메일과 같은 비밀번호로 가입되는지 확인한다.

## [3-2] 인증 실패 횟수 제한

- **가이드 정의**: 인증 시도 실패 횟수 제한이 없으면 무한 반복으로 Brute Force·Dictionary Attack에 취약하다. 대응방안은 실패 횟수를 기록하고 임계치 초과 시 일시적으로 로그인을 중지하는 것이다(예: 5회 실패 시 계정 잠금).
- **준수기준 / 오너 / 플래그ID**: 일반 / P1 / `"3-2"`
- **대상 위치**
  - `BE/service/AuthService.login()` (호출부 — 수정하지 않음)
  - `BE/service/LoginAttemptService.checkLocked()`, `recordFailure()`, `recordSuccess()`
  - `BE/entity/AppUser.recordLoginFailure()` (5회째 실패에서 15분 잠금, 카운트 0으로 초기화)
  - 설정: `BE-res/application.yaml` `app.login: { max-failures: 5, lock-minutes: 15 }`
- **🟢 안전 코드(현재)**: 연속 5회 실패 시 15분 잠금(423). 실패 기록은 `REQUIRES_NEW`로 커밋해서 로그인 예외 롤백에 휩쓸리지 않는다.

```java
try {
    loginAttempt.checkLocked(user);
} catch (AccountLockedException e) { ... throw e; }

if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
    loginAttempt.recordFailure(user.getId());
    ...
    throw new InvalidCredentialsException(...);
}
```

- **🔴 취약 코드 패턴 (토글 on)** — 분기 위치: `LoginAttemptService` 안 (P1). `AuthService.login()`은 그대로 두고 호출만 한다.
  - `checkLocked()`: 토글이 켜져 있으면 잠금 여부를 보지 않고 바로 반환한다.
  - `recordFailure()`: 토글이 켜져 있으면 실패 횟수를 올리지 않는다. 결과적으로 잠금 없이 무한 대입이 가능하다.
  - 변형(선택): `recordFailure()`를 `REQUIRES_NEW` 없이 호출해서 카운트가 롤백되는 "있는 척하는 잠금"을 재현한다. 코드 리뷰 실습용이다.
- **PoC(공격 재현)**
  - 같은 이메일로 틀린 비밀번호를 6회 이상 보낸다: `POST /api/auth/login`.
  - 안전 모드: 6번째부터 423 `ACCOUNT_LOCKED`. 취약 모드: 계속 401이고, 정답을 넣으면 바로 200.
- **진단 포인트**
  - Burp Intruder 등으로 N회 반복한 뒤 상태코드 변화(401 → 423)를 확인한다.
  - 정답 비밀번호로 잠금 해제 시간 전에 로그인이 되는지 확인한다.

## [3-3] 계정 정보 파악 가능성

- **가이드 정의**: 다른 사용자의 계정 정보·목록·전체 정보를 보여주면 패스워드 추측이나 접근 시도에 중요한 정보를 주게 된다. 대응방안은 해당 페이지를 제거하고, 노출이 필요하면 별명이나 마스킹(`abcd**`)을 쓰는 것이다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P2 / `"3-3"`
- **대상 위치**
  - `BE/controller/UserController.lookup()` → `BE/dto/response/UserLookupResponse`
  - `BE/service/AuthService.signup()` (`existsByEmail` → 409 `EMAIL_DUPLICATED`)
  - `BE/dto/response/DocumentSummaryResponse.UploadedBy` (이름·직급만 노출)
- **🟢 안전 코드(현재)**
  - 사용자 조회는 정확한 이메일 1건만 받는다(부분 검색·명부 조회 없음). 팀장만 쓸 수 있고, 분당 30회로 제한한다.
  - 목록 응답의 등록자 정보는 이메일 없이 이름·직급만 준다.

```java
rateLimiter.checkLookup(me.getId());
accessPolicy.registerOrThrow(me.getId());
AppUser target = users.findByEmail(email)
        .orElseThrow(() -> new UserNotFoundException("email lookup miss"));
```

  - **현재 남아 있는 노출**: 가입 API가 이미 있는 이메일에 409 `이미 가입된 이메일입니다.`를 돌려준다. 비인증 상태에서 가입 여부를 확인할 수 있다. 가입 UX상 의도된 동작이므로 진단 결과에 "일부 노출"로 기록한다.
- **🔴 취약 코드 패턴 (토글 on)**
  - `lookup`: `registerOrThrow`와 `rateLimiter.checkLookup`을 생략하고, `email`을 `LIKE %키워드%`로 검색해 **목록(이메일 전체, 이름, uuid)**을 돌려준다.
  - 예) `users.findByEmailContaining(keyword)`(`AppUserRepository`에 추가) → `List<UserLookupResponse>`.
  - `lookup`의 `@RequestParam @Email` 제약도 런타임에 끌 수 없으므로 `@Email`을 지우고, 안전 분기에서 이메일 형식을 직접 검사한다(실패 시 400 `VALIDATION_ERROR`). 기존 테스트는 정상 이메일(`nobody@example.com`)로 호출하므로 영향이 없다.
- **PoC(공격 재현)**
  - 사원 계정으로 `GET /api/users/lookup?email=@` → 안전 모드는 400(형식 오류), 형식이 맞는 이메일이면 403(사원은 조회 불가). 취약 모드는 `@`가 들어간 모든 사용자, 즉 전체 이메일 목록이 나온다.
  - 비인증: `POST /api/auth/signup`에 후보 이메일을 넣어 409/201로 가입 여부를 판별한다 (현재 동작).
- **진단 포인트**
  - 사용자 검색·초대·작성자 표시 응답에 전체 이메일(로그인 ID)이 나오는지, 권한·횟수 제한이 있는지 확인한다.
  - 가입·로그인·비밀번호 찾기 응답 차이로 계정 존재를 유추할 수 있는지 확인한다 (6-2와 함께).

## [4-2] 인증(세션 및 토큰) 값 안전성 설정 여부

- **가이드 정의**: 인증(세션·토큰) 값의 복잡도, 만료시간(권고 30분), 로그아웃 시 파기, 일회성 토큰의 사용횟수 제한, 로그인마다 새 ID 발급, 중복 로그인 제어를 확인한다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P2 / `"4-2"`
- **대상 위치**
  - `BE/security/JwtProvider` (생성자 키 길이 검사, `createAccessToken()`, `parsePublicId()`)
  - `BE/service/AuthService.issueTokens()`, `randomToken()`, `refresh()`, `logout()`
  - 설정: `BE-res/application.yaml` `jwt.access-expiration: 900000`(15분), `jwt.refresh-expiration`(14일)
- **🟢 안전 코드(현재)**
  - Access Token은 HMAC 서명을 사용한다. `JwtProvider`는 32바이트 이상 키를 요구하며 `signWith(key)`에 따라 서명 알고리즘을 선택한다. 만료는 15분이고 subject는 UUID인 `public_id`다.
  - Refresh Token: 256비트 `SecureRandom` 난수이고, DB에는 SHA-256 해시만 저장한다.
  - 재발급마다 회전하고, 폐기된 토큰이 다시 오면 그 사용자 토큰을 전부 폐기한다(재사용 탐지). 로그아웃 시 폐기한다.

```java
if (token.isRevoked()) {
    tokens.revokeAllByUserId(token.getUser().getId());
    throw new BusinessException(ErrorCode.UNAUTHORIZED, "refresh token reuse detected");
}
if (token.isExpired()) { throw ...; }
token.revoke();
return issueTokens(token.getUser());
```

  - 참고(잔존 위험): Access Token은 무상태라 로그아웃 후에도 만료(최대 15분) 전까지는 유효하다. 중복 로그인 제한은 없다.
- **🔴 취약 코드 패턴 (토글 on)**
  - `refresh()`: 회전·폐기·재사용 탐지를 하지 않고, 같은 Refresh Token을 계속 받아 Access Token만 새로 준다.
  - `logout()`: 토큰을 폐기하지 않는다(쿠키만 지운다).
  - `JwtProvider.createAccessToken()`: 토글이 켜져 있으면 만료를 30일로 발급한다(env 선택값은 시작 시 고정되며 변경 후 재시작한다).
  - 서명 키: 5-1의 `application-lab.yaml`이 넣는 더미 기본값 `FAKE-LAB-doqflow-jwt-secret-000000`(34바이트, HS256 최소 32바이트 충족)을 쓴다. 키 자체는 4-2 오너가 아니라 5-1(P4)이 관리한다.
- **PoC(공격 재현)**
  - 로그인 후 `doq_refresh` 쿠키 값을 복사 → `POST /api/auth/logout` → 복사한 값으로 `POST /api/auth/refresh` 요청.
  - 안전 모드: 401. 취약 모드: 200 + 새 Access Token.
  - 5-1 lab 설정으로 더미 키를 쓰는 상태라면, 그 키로 다른 사용자의 `sub`(uuid)를 넣은 토큰을 만들어 본다(lab 키 한정, 5-1과 연계).
- **진단 포인트**
  - 토큰 만료(`exp - iat`), 로그아웃 후 재사용, 재발급 후 이전 토큰 재사용, 서명 키 강도를 확인한다.

## [4-3] 접근제어 우회 가능성 확인

- **가이드 정의**: 접근 제어·권한 체크를 Client Side Script로 처리하면 사용자가 임의로 수정해 쉽게 우회할 수 있다. 중요정보 화면에 no-cache를 설정하지 않으면 로그아웃 후에도 뒤로 가기로 열람할 수 있다. 대응방안은 인증·권한 처리를 Server Side에서 구현하고 cache 사용을 제한하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P3 / `"4-3"` (백엔드 변경분은 홍서연 cross-review)
- **대상 위치**
  - 프론트(화면 분기만): `FE/src/pages/DashboardPage.jsx` (`isLeader`로 문서 등록 버튼 노출), `FE/src/routes/ProtectedRoute.jsx`, `FE/src/services/api.js` (요청 인터셉터)
  - 서버(최종 인가): `BE/service/DocumentService.create()` → `BE/security/AccessPolicy.registerOrThrow()`
  - 캐시: `BE/security/SecurityConfig.securityFilterChain()` (Spring Security 기본 `Cache-Control: no-cache, no-store`)
- **🟢 안전 코드(현재)**: 화면은 `rankLevel`로 버튼만 숨기고, 실제 판정은 서버가 요청마다 **DB의 직급**으로 한다(토큰·요청 값 미사용). `ProtectedRoute` 주석에도 "최종 인가는 서버가 합니다"라고 되어 있다.

```java
// DocumentService.create()
accessPolicy.registerOrThrow(me.getId());   // rank_level == 2(팀장)만 통과
```

- **🔴 취약 코드 패턴 (토글 on)**
  - `DocumentService.create()` (P3): `registerOrThrow` 대신 요청 헤더 `X-User-Rank` 값을 믿고 판정한다. 프론트 `api.js` 인터셉터는 4-3 플래그가 켜져 있을 때만 `authStore.user.rankLevel`로 이 헤더를 붙인다. (인터셉터는 React 컴포넌트가 아니라 훅을 쓸 수 없으므로, `FE/src/utils/vulnFlags.js`의 `isVulnEnabled(id)`를 호출한다.) 화면 값이 곧 권한이 되는 구조다.
  - ⚠️ `AccessPolicy.registerOrThrow()` 자체를 고치지 말 것. 이 메서드는 `UserController.lookup()`(3-3)도 쓰므로 조회 권한까지 같이 풀린다.
  - 캐시: `SecurityConfig`에서 기본 캐시 헤더를 끄고, 토글이 꺼져 있을 때만 다시 붙이는 헤더 작성기를 등록한다. 예) `.headers(h -> h.cacheControl(c -> c.disable()).addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(req -> !vulnToggle.on("4-3"), new CacheControlHeadersWriter())))`. 현재 env 방식에서는 재시작 이후 값이 바뀐다. 이 예시는 조건부 헤더 적용 위치이며 실시간 전환을 위한 요구가 아니다.
- **PoC(공격 재현)**
  - 사원 계정으로 `POST /api/documents` + 헤더 `X-User-Rank: 2` → 안전 403 / 취약 201.
  - 캐시 분기 확인: 문서 원문 조회 응답의 헤더를 본다. `curl -i -H "Authorization: Bearer <토큰>" https://<lab-host>/api/documents/1/versions/1/content` → 안전 모드는 `Cache-Control: no-cache, no-store, ...`, 취약 모드는 그 헤더가 사라진다. (이 앱은 SPA라 "로그아웃 후 뒤로 가기"로는 재현되지 않는다 — 로그아웃 시 메모리 스토어가 비워져 `/login`으로 튕긴다. 캐시 취약점은 헤더 유무로 판정한다.)
- **진단 포인트**
  - 화면에서 숨겨진 기능의 API를 낮은 권한 계정으로 직접 호출한다. 요청 본문·헤더에 권한 필드(`X-User-Rank`, `rankLevel`)를 넣어 서버가 신뢰하는지 본다.
  - 중요정보 응답 헤더의 `Cache-Control`, `Pragma`, `Expires`를 확인한다.

## [4-4] 비인증 상태로 중요 page 접근 가능성

- **가이드 정의**: 로그인 후 사용하는 페이지는 반드시 로그인 확인을 거쳐야 한다. 로그인 확인 모듈이 없는 페이지가 있으면 직접 접근이 가능하다. 대응방안은 페이지마다 로그인·권한 체크 모듈을 적용하고, 누락 방지를 위해 공통 모듈을 사용하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P3 / `"4-4"` (백엔드 변경분은 홍서연 cross-review)
- **대상 위치**
  - `BE/security/SecurityConfig` `PUBLIC_PATHS`, `securityFilterChain()` (`anyRequest().authenticated()`)
  - `BE/security/JwtAuthFilter.doFilterInternal()`
  - `BE/security/CurrentUserResolver` (`@CurrentUser` 주입 — 인증 없으면 401, 수정하지 않음)
  - `BE/controller/VersionController`
- **🟢 안전 코드(현재)**: 백엔드 공개 목록은 가입·로그인·재발급과 `/actuator/health`, `/actuator/info`다. 다른 일반 요청은 공통 필터 체인에서 인증을 요구하고 `/internal/**`은 거부한다. 외부 nginx는 `/api/actuator`를 차단한다.

```java
private static final String[] PUBLIC_PATHS = {
    "/auth/signup", "/auth/login", "/auth/refresh", "/actuator/health", "/actuator/info"
};
...
.requestMatchers("/internal/**").denyAll()
.requestMatchers(PUBLIC_PATHS).permitAll()
.anyRequest().authenticated())
```

- **🔴 취약 코드 패턴 (토글 on)**
  - **경로만 공개해서는 재현되지 않는다.** 기존 `VersionController.content()`는 `@CurrentUser AppUser me`를 받는데, `CurrentUserResolver`는 인증이 없으면 `me`를 null로 두지 않고 **401을 던진다**. 그래서 아래 두 가지를 함께 한다.
  - `VersionController` (P3): `@CurrentUser` 없는 조회 경로 `GET /documents/{documentId}/versions/{versionNo}/content-open`을 추가한다. 토글이 꺼져 있으면 404를 던지고, 켜져 있으면 `documentRepository.findById()`로 문서를 찾아 **기존 public 메서드** `versionService.getContent(Document, int)`를 호출한다. `VersionService`(P1 파일)는 수정하지 않는다.
  - `SecurityConfig` (P3): 이 경로를 공개 경로로 허용하되, 배열에 넣지 말고 요청마다 토글을 읽는 매처로 등록한다. 예) `.requestMatchers(req -> vulnToggle.on("4-4") && req.getRequestURI().endsWith("/content-open")).permitAll()`을 `anyRequest()` 앞에 둔다. 현재 설정도 시작 시 고정된다. 시작 시 조건부 경로를 등록하는 구현도 가능하나, OFF에서 공개 경로가 남지 않는지 검증한다.
- **PoC(공격 재현)**
  - Authorization 헤더 없이 `GET /api/documents/1/versions/1/content-open` → 안전 401 / 취약 200 + 본문.
  - 로그인 상태에서 수집한 API 목록을 토큰 없이 그대로 재전송(강제 브라우징)해, 401이 아닌 응답이 있는지 훑는다.
- **진단 포인트**
  - 인증이 필요한 모든 엔드포인트를 토큰 없이 호출해 401이 유지되는지 확인한다. 특히 "조회만 하는데 왜 로그인이 필요하냐"는 식으로 열어둔 보조 경로가 없는지 본다.

## [4-5] 일반계정 권한 상승 가능성

- **담당**: P2. 팀장 가입 키 정상 baseline은 리드가 구현하고, P2가 이후 항목별 분기를 담당한다.
- **역할**: 사원(1)·팀장(2). 별도 ADMIN은 없다. 같은 팀장이라도 다른 등록자의 문서를 수정할 수 없다.
- **기존 문제**: 원본 main은 `signupKey`를 받기만 하고 검증하지 않았다.
- **현재 코드**: `BE/service/AuthService.signup()` → `BE/service/SignupKeyPolicy.validate()`.
  `SIGNUP_KEY_LEAD`와 일치해야 팀장 가입 가능. 미설정·누락·불일치는 400 `INVALID_SIGNUP_KEY`.
  사원 가입에는 키가 필요 없다. 키 값은 로그/응답에 넣지 않는다.
- **문서 소유권**: 기존 `BE/security/AccessPolicy.writeOrThrow()`를 유지한다. 읽기 권한 없음은 404,
  읽을 수 있지만 등록자가 아닌 경우는 403. 팀장 관리 목록도 등록자 본인 것만 반환한다.
- **검증**: `SignupKeyPolicyTest`, `ApiControllerIntegrationTest.leadSignupValidatesServerKey()`.
  P2는 이 정상 동작을 baseline으로 먼저 반영한 뒤 분기를 추가한다. 같은 파일을 동시에 수정하지 않는다.
- **취약 분기 상태**: 아직 주입하지 않았다. env 번호만으로 가입 검증이 해제되지 않는다.

# Part B — 프론트·공통·인프라

## [1-1] XSS / CSRF 공격 가능성

- **가이드 정의**: 공격자가 웹 애플리케이션을 통해 다른 사용자에게 악성코드(JavaScript 등)를 보내 사용자 의도와 상관없이 특정 행위를 발생시키는 취약점. 쿠키 탈취·세션 도용·CSRF로 이어지고, DOM 환경에서는 서버와 관계없이 브라우저에서 발생한다. 대응방안은 헤더·쿠키·질의문·폼 필드 등 모든 파라미터를 엄격히 검증하고 `<`, `>`, `(`, `)` 등을 HTML 엔티티로 변환하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 중요 / P3 / `"1-1"` (백엔드 변경분은 홍서연 cross-review)
- **대상 위치**
  - XSS(프론트)
    - `FE/src/components/common/MarkdownView.jsx` `renderInline()` ← `FE/src/components/document/VersionPeekPanel.jsx` (업로드한 문서 원문 표시)
    - `FE/src/components/chat/ChatMessage.jsx` (AI 답변·근거 `chunkText` 표시)
    - `FE/src/components/document/DiffViewer.jsx` (비교 결과 줄 표시)
    - CSP: `FE/nginx/http|https/default.conf.template` `Content-Security-Policy`
  - CSRF(백엔드)
    - `BE/security/RefreshTokenCookie.build()` (`SameSite=Strict`)
    - `BE/security/SecurityConfig` (`csrf.disable()`, `corsConfigurationSource()` `allowCredentials=false`)
- **🟢 안전 코드(현재)**
  - XSS: `dangerouslySetInnerHTML`·`innerHTML`을 쓰는 곳이 없다. 마크다운도 문자열을 React 엘리먼트로 바꿔 JSX 텍스트로 넣으므로 자동 이스케이프된다. CSP가 `script-src 'self'`라 인라인 스크립트도 차단된다.
  - CSRF: 일반 API는 `Authorization` 헤더(Bearer)로만 인증하므로 자동 전송되는 자격증명이 없다. 쿠키를 쓰는 `/auth/refresh`, `/auth/logout`은 `SameSite=Strict`로 막는다.

```jsx
// ChatMessage.jsx — 텍스트 노드로만 출력
<p>{body}</p>
```

```java
// RefreshTokenCookie.build()
ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Strict")
        .path(request.getContextPath() + "/auth").maxAge(age).build();
```

  - **링크 검증 범위**: `MarkdownView`의 링크에는 앱 자체의 스킴 허용 목록이 없다. 링크 렌더링과 nginx CSP 적용 여부는 각각 확인한다. 현재 소스를 읽은 결과와 브라우저에서 관찰한 결과를 구분해 기록한다.
- **🔴 취약 코드 패턴 (토글 on)**
  - XSS: `MarkdownView`에서 `useVulnFlag('1-1')`이 켜져 있으면 원문을 HTML로 그대로 넣는다.

```jsx
// === [VULN 1-1] guideline:1-1 | owner:P3 | START ===
if (vuln11) {                                   // 🔴 INSECURE
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
// 🟢 SECURE: 기존 renderInline/블록 렌더링 그대로
// === [VULN 1-1] END ===
```

  - CSP 전제: 배포 nginx의 CSP(`script-src 'self'`)는 인라인 이벤트 핸들러(`onerror` 등)를 막는다. XSS 실습은 ① CSP가 없는 로컬 Vite 개발 서버에서 하거나 ② P4가 만드는 `lab` nginx 템플릿(7-4, 보안 헤더 완화)을 쓴다. CSP 변경은 nginx 파일 오너인 P4가 하고, 1-1 오너(P3)는 nginx를 수정하지 않는다.
  - CSRF: `RefreshTokenCookie.build()`에서 토글이 켜져 있으면 `SameSite=None`으로 발급한다(Secure는 그대로 — `SameSite=None`은 Secure가 필수다).
  - CORS(선택): 응답까지 읽는 공격을 재현하려면 `SecurityConfig.corsConfigurationSource()`를 시작 시 고정된 플래그에 따라 설정을 선택하도록 바꿔, 켜져 있으면 `allowCredentials=true` + 요청 Origin 반사(`setAllowedOriginPatterns(List.of("*"))`) 설정을 돌려주게 한다.
- **PoC(공격 재현)**
  - 저장형 XSS: 아래 내용을 `note.md`로 버전 업로드 → 초대받은 다른 사용자가 원문 보기 → 스크립트 실행.

```markdown
# 공지
<img src=x onerror="alert(document.domain)">
```

  - CSRF(SameSite만 완화): 다른 사이트의 공격자 페이지에서 `fetch('https://<lab-host>/api/auth/logout', {method:'POST', credentials:'include'})` → 피해자 Refresh Token이 폐기되어 강제 로그아웃. 본문 없는 POST라 CORS 설정과 관계없이 요청은 전송된다. 안전 모드는 `SameSite=Strict`라 쿠키가 실리지 않아 아무 일도 없다.
  - 응답 탈취(CORS까지 완화): 같은 방식으로 `/api/auth/refresh`를 호출하고 응답 본문의 `accessToken`을 읽는다. CORS 분기를 켰을 때만 읽을 수 있다.
  - 재현 조건: 공격자 페이지는 다른 사이트여야 한다(예: 앱 `localhost`, 공격 페이지 `127.0.0.1`). 브라우저의 서드파티 쿠키 차단 설정이 켜져 있으면 재현이 안 될 수 있다.
- **진단 포인트**
  - 업로드 문서, 문서 이름·설명, 채팅 질문처럼 다른 사용자에게 다시 보여지는 모든 입력에 XSS 페이로드를 넣어 확인한다.
  - 응답 CSP 헤더를 확인한다. 쿠키 `SameSite`, CORS `Access-Control-Allow-Credentials`와 `Allow-Origin` 반사 여부를 확인한다.

## [4-1] 쿠키(Cookie) 및 웹 스토리지(Web Storage) 조작 가능성

- **가이드 정의**: 쿠키·웹 스토리지에 인증정보, 권한, 중요 데이터를 저장해 그 값만으로 인증하면, 값을 조작해 다른 사용자나 관리자로 도용하거나 권한 상승·인증 우회가 가능하다. 대응방안은 Server Side Session을 쓰는 것이다. 부득이하면 추측·변조할 수 없게 암호화하고, 중요 프로세스에는 추가 인증을 한다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P3 / `"4-1"` (백엔드 변경분은 홍서연 cross-review)
- **대상 위치**
  - `FE/src/store/authStore.js` (`accessToken`, `user` 보관)
  - `FE/src/services/api.js` (요청 인터셉터의 `Authorization` 헤더), `FE/src/services/tokenRefresh.js` `refreshAccessToken()`
  - `BE/security/RefreshTokenCookie` (`doq_refresh` 쿠키 속성)
- **🟢 안전 코드(현재)**
  - Access Token과 사용자 정보는 **메모리(zustand)**에만 둔다. `localStorage`·`sessionStorage`를 쓰는 곳이 없다. 새로고침 후에는 HttpOnly 쿠키로 재발급해서 복구한다.
  - Refresh Token 쿠키는 `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`이고 값은 256비트 난수다. `Secure`는 `REFRESH_COOKIE_SECURE`에 따라 달라지며, 검토한 K8s ConfigMap의 값은 `false`다. 운영 응답의 실제 쿠키 속성은 별도로 확인한다.

```js
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  ...
}));
```

- **🔴 취약 코드 패턴 (토글 on)**
  - 프론트: 로그인 시 `localStorage.setItem('accessToken', ...)`, `localStorage.setItem('user', JSON.stringify(me))`로 저장하고, 화면 권한 분기(`isLeader`)를 `localStorage.user.rankLevel`에서 읽는다.
  - 백엔드: `RefreshTokenCookie.build()`에서 토글이 켜져 있으면 `httpOnly(false)`로 발급한다. 스크립트로 Refresh Token을 읽을 수 있게 된다.
  - 기존 통합테스트(`AuthCookieIntegrationTest`, `ContextPathIntegrationTest`)가 `HttpOnly`·`SameSite=Strict`를 검사한다. 토글 off에서는 그대로 통과해야 한다.
- **PoC(공격 재현)**
  - 개발자도구 콘솔에서 `localStorage.user` 수정: `localStorage.setItem('user', JSON.stringify({...JSON.parse(localStorage.user), rankLevel:2}))` → 새로고침 → 팀장 메뉴(문서 등록 버튼) 노출. 4-1만 켜면 **화면만** 바뀌고 서버 요청은 403이다. 서버까지 통과하는 것은 4-3(서버가 `X-User-Rank` 헤더를 믿음)을 함께 켰을 때다.
  - XSS(1-1)와 연계: `document.cookie`(HttpOnly 해제 시 `doq_refresh`), `localStorage.accessToken`을 읽어 외부로 보낼 수 있는지 확인한다.
- **진단 포인트**
  - 로그인 후 Application 탭에서 쿠키 속성(HttpOnly, Secure, SameSite)과 스토리지 키를 점검한다.
  - 저장된 값을 변조했을 때 서버 응답이 달라지는지 확인한다.

## [5-1] 소스코드 내 주요정보 노출 여부

- **가이드 정의**: 웹 페이지 소스에 인증 정보를 하드코딩하거나 외부 컴포넌트와 통신하면 DB 커넥션 정보, FTP 인증 정보 등이 노출되어 위장·권한 상승에 쓰일 수 있다. 대응방안은 인증 모듈·별도 인증 서버(HSM, KMS 등)를 쓰고, 인증정보를 암호화해서 접근하기 어려운 곳에 저장하며, 주석 속 인증정보도 제거하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P4 / `"5-1"` (백엔드 변경분은 홍서연 cross-review)
- **대상 위치**
  - `BE-res/application.yaml` (`jwt.secret`, `ai.internal-key`, `spring.datasource.*`, `app.signup.lead-key`)
  - `DoQFlow_AI_Backend/.env.example`, `.gitignore`
  - `FE/.env.example`, `FE/deploy/.env.example`, `FE/k8s/secret.yaml.example`, `FE/mock/server.js`
  - 프론트 빌드 산출물(`dist/assets/*.js`)
- **🟢 안전 코드(현재)**
  - 모든 비밀값은 `${ENV}` 환경변수로 받고 기본값이 없다. 예시 파일은 빈 값이며 `.env`, `*.pem`, `*.key`, `k8s/*secret*.yaml`은 git에서 제외한다.
  - Dockerfile 주석에도 "비밀값은 이미지에 넣지 않는다"고 명시되어 있다. 프론트 번들에는 비밀값이 없다(`VITE_API_URL`만 사용).
  - `FE/mock/server.js`의 `SIGNUP_KEY = 'LEAD-KEY'`는 목 서버 전용 더미이고, `.dockerignore`로 이미지에서 제외된다.
  - **진단 시 오탐 주의(지적 아님)**: 테스트 코드의 `jwt.secret = "integration-test-secret..."`와 CI 워크플로의 `SIGNUP_KEY_LEAD: ci-signup-key`, `MARIADB_ROOT_PASSWORD: ci-root-password`는 테스트·CI 전용 값이다. 운영 비밀값이 아니므로 5-1 지적 대상이 아니다. (단, 운영 레포라면 CI 값도 GitHub Secrets로 빼는 것이 권장이라는 정도만 참고로 남긴다.)

```yaml
jwt:
  secret: ${JWT_SECRET}
ai:
  internal-key: ${AI_INTERNAL_KEY}
```

- **🔴 취약 코드 패턴 (토글 on — 정적 설정이므로 `lab` 프로필 파일로 분리)**
  - `application-lab.yaml`: `jwt.secret: ${JWT_SECRET:FAKE-LAB-doqflow-jwt-secret-000000}`, `ai.internal-key: FAKE-LAB-internal-key` 같이 기본값을 하드코딩한다.
  - 프론트: lab 빌드 HTML에 `<!-- 테스트 계정 lab-admin@lab.test / FAKE-LAB-Passw0rd! -->` 주석이 들어가게 한다. 3-5와 같은 방식으로 `FE/lab/head.html`에 함께 넣으면 lab 빌드에서만 나온다. 가이드가 말하는 "웹 페이지 소스에 인증 정보 하드코딩"을 그대로 재현한다. (`api.js`는 4-3 오너 파일이라 쓰지 않는다.)
  - **모든 값은 더미**이고, 실제 키는 절대 쓰지 않는다.
- **PoC(공격 재현)**
  - 브라우저에서 페이지 소스 보기(`view-source:`)로 HTML 주석의 계정 정보를 찾는다. `/assets/index-*.js`도 내려받아 `FAKE-LAB`, `KEY`, `password`, `secret`을 검색한다.
  - 백엔드 쪽은 레포·이미지에서 `application-lab.yaml`을 확인해 더미 JWT 키를 찾고, 그 키로 토큰을 만들어 본다(4-2와 연계).
- **진단 포인트**
  - 소스(레포)·빌드 산출물·HTML 주석에서 키·비밀번호·내부 주소를 패턴 검색한다(gitleaks, trufflehog 등).

## [5-2] 요청 및 응답 값 내 주요정보 포함여부 확인

- **가이드 정의**: 파라미터 값에 디렉터리·파일구조·개인정보·사용자 식별값·결제정보 같은 중요한 값이 있으면 노출될 수 있다. 개인정보를 평문 전송하면 스니핑될 수 있다. 대응방안은 중요 값을 노출하지 않거나 간접 값을 쓰는 것이고, 개인정보·인증정보는 암호화 또는 SSL로 전송하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 중요 / P2 / `"5-2"`
- **대상 위치**
  - `BE/controller/UserController.me()` → `BE/dto/response/MeResponse`
  - `BE/dto/response/TokenResponse` (`@JsonIgnore refreshToken`)
  - `BE/dto/response/PermissionResponse`, `UserLookupResponse`
  - `BE/service/VersionFileStorage.relativePath()` (저장 경로는 응답에 넣지 않음)
- **🟢 안전 코드(현재)**
  - 엔티티를 그대로 반환하지 않고 DTO(record)로 필요한 필드만 내린다. `passwordHash`, 실패 횟수, 잠금 시각, 내부 PK는 사용자 응답에 없다.
  - Refresh Token은 본문에서 제외하고 HttpOnly 쿠키로만 준다. 업로드 저장 경로·저장 파일명도 응답에 넣지 않는다.

```java
public record TokenResponse(String accessToken, @JsonIgnore String refreshToken, String name, int rankLevel) { ... }
public record MeResponse(String uuid, String email, String name, int rankLevel, LocalDateTime createdAt) { ... }
```

- **🔴 취약 코드 패턴 (토글 on)**
  - `UserController.me()` (P2): 토글이 켜져 있으면 `MeResponse` 대신 `MeDebugResponse`(신규)를 돌려준다. 엔티티 필드를 그대로 옮겨 `id`, `passwordHash`, `failedLoginCount`, `lockedUntil`이 노출된다. 엔티티를 직접 직렬화하는 것보다 DTO로 만드는 편이 지연 로딩 문제 없이 확실하다.
  - `AuthController.login()` (P2): 토글이 켜져 있으면 `refreshToken`을 포함한 응답(신규 `TokenDebugResponse`)을 돌려준다. `TokenResponse`의 `@JsonIgnore`는 어노테이션이라 런타임에 끌 수 없으므로 그대로 둔다.
  - 저장 경로 노출은 넣지 않는다. 버전 응답은 `VersionService`(P1 파일)에서 만들어지므로 오너가 겹친다.
- **PoC(공격 재현)**
  - `GET /api/users/me` → 취약 모드 응답에 `passwordHash: "$2a$10$..."`.
  - `POST /api/auth/login` 응답 본문에 `refreshToken` 포함 여부를 확인한다.
- **진단 포인트**
  - 모든 응답 JSON에서 해시·토큰·내부 경로·불필요한 개인정보 키를 검색한다. URL 쿼리에 개인정보·토큰이 실리는지도 확인한다.

## [6-1] 오류페이지를 통한 정보 노출 여부

- **가이드 정의**: DB 에러, 소스 코드·예외처리·시스템 콜·API 호출 관련 에러가 노출되면 잠재적 취약점을 유추할 수 있다. 대응방안은 모든 에러(403, 404, 500, DB 에러, 애플리케이션 에러 등)에 별도 에러 페이지를 만들고, WEB/WAS 양쪽에서 디폴트 오류 메시지가 노출되지 않게 하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P2 / `"6-1"`
- **대상 위치**
  - `BE/exception/GlobalExceptionHandler` (`build()`, `handleUnexpected()`, `handleBodyValidation()`)
  - `BE/exception/ErrorCode` (고정 문구)
  - `BE-res/application.yaml` `server.error.include-stacktrace: never`, `include-message: never` (현재 설정 — 수정하지 않음)
  - 프론트: `FE/src/utils/errors.js` `getErrorMessage()`, `FE/src/pages/ErrorPage.jsx`
- **🟢 안전 코드(현재)**: 예상 밖 예외의 `500` 응답은 고정 문구와 `traceId`를 반환한다. 입력 검증의 `400` 응답은 필드명과 검증 메시지를 반환한다. 프런트는 500·502·네트워크 오류를 정해진 문구로 표시한다.

```java
private ResponseEntity<ErrorResponse> build(ErrorCode code, Exception e) {
    if (code.status() >= 500) log.error("[{}] {} {}", traceId(), code.name(), e.getMessage(), e);
    else log.warn(...);
    return ResponseEntity.status(code.status()).body(ErrorResponse.of(code, traceId()));
}
```

- **🔴 취약 코드 패턴 (토글 on)**
  - `handleUnexpected()`·`build()`: 응답 `message`에 `e.toString()`과 스택 트레이스 상위 20줄, `e.getCause()` 메시지(SQL 오류 포함)를 넣는다.
  - `server.error.*` 설정은 바꾸지 않는다. 이 설정은 Spring 기본 오류 처리(`/error`)에만 쓰이는데, 이 앱은 `GlobalExceptionHandler`가 컨트롤러 예외를 모두 잡고 필터 단계 401·403도 이 핸들러로 넘긴다. 핸들러 분기만으로 충분하고, yaml은 P4 파일이라 건드리지 않는다.
  - 프론트(선택, P2): `getErrorMessage()`가 500에서도 서버 `message`를 그대로 화면에 띄운다. 지금은 4xx만 서버 문구를 보여주고 5xx는 고정 문구로 바꾼다.
- **PoC(공격 재현)**
  - 500(미처리 예외)을 유발해야 스택이 보인다. 확실한 트리거는 **1-2 취약 모드의 `sort=created_at'`** (네이티브 쿼리 실행 중 예외 → `handleUnexpected` → 500).
  - 주의: `GET /api/documents/abc`(타입 불일치)·깨진 JSON은 **400 `VALIDATION_ERROR`**로 잡힌다(500 아님). 이들은 "안전 모드에서도 400으로 깔끔히 처리됨"을 보여주는 대조군으로 쓴다.
  - 안전 모드는 `"일시적인 오류가 발생했습니다."` + `traceId`만, 취약 모드는 `org.hibernate...` 예외 문자열, 클래스·패키지명, DB 종류(MariaDB)가 노출된다.
- **진단 포인트**
  - 500을 유발해 응답 본문의 스택·프레임워크 버전·SQL을 확인한다. 4xx는 고정 문구+traceId만 나오는지 확인한다. nginx 기본 에러 페이지(502·504)의 노출도 확인한다.

## [6-2] 일괄적인 오류 처리 페이지 존재 여부

- **가이드 정의**: 로그인 페이지에서 잘못된 계정 정보를 넣었을 때 계정 존재 유무를 알 수 있는 메시지나 상이한 오류코드를 주면, 유효한 계정을 파악해 무작위 대입에 쓸 수 있다. 대응방안은 계정·비밀번호 불일치에 일괄적인 오류메시지와 오류코드를 쓰는 것이다(예: "계정이 존재하지 않거나, 계정 또는 패스워드가 틀립니다.").
- **준수기준 / 오너 / 플래그ID**: 일반 / P2 / `"6-2"`
- **대상 위치**
  - `BE/service/AuthService.login()` (미가입·불일치 모두 `InvalidCredentialsException`)
  - `BE/exception/ErrorCode.INVALID_CREDENTIALS` (401, "이메일 또는 비밀번호가 올바르지 않습니다.")
  - `BE/service/AuthService.refresh()` (없는·만료·폐기 토큰 모두 401)
  - 프론트: `FE/src/pages/LoginPage.jsx` `submit()` → `getErrorMessage()`
- **🟢 안전 코드(현재)**: 미가입 이메일과 비밀번호 불일치에 같은 예외·같은 401·같은 문구를 쓴다. 상세 사유는 감사 로그에만 마스킹된 이메일로 남긴다.

```java
if (user == null) {
    audit.log(..., "no such email: " + masked);
    throw new InvalidCredentialsException("no such email");
}
...
if (!passwordEncoder.matches(...)) {
    ...
    throw new InvalidCredentialsException("password mismatch: userId=" + user.getId());
}
```

  - **잠재 ①(잠금 상태 유추)**: 계정 잠금(423 `ACCOUNT_LOCKED`)은 존재하는 계정에서만 발생한다. 같은 이메일로 6회 이상 실패했을 때 423이 나오면 그 계정이 존재한다는 뜻이 된다. 잠금 응답 형식이 바뀌거나 실패 횟수가 줄면 열거가 더 쉬워진다.
  - **잠재 ②(타이밍 오라클)**: `login()`은 미가입 이메일이면 `passwordEncoder.matches()`(BCrypt)를 **호출하기 전에** 바로 예외를 던진다. 반면 가입된 이메일은 BCrypt 비교를 거치므로 응답이 수십 ms 더 걸린다. 상태코드·문구는 같아도 **응답 시간 차이**로 계정 존재를 유추할 수 있다. (대응: 미가입일 때도 더미 해시로 BCrypt를 한 번 돌려 시간을 맞추는 것을 권고. 교육용으로는 "문구는 일괄 처리됐지만 타이밍은 남는다"는 사례로 가치가 있다.)
- **🔴 취약 코드 패턴 (토글 on)**
  - `login()`: 미가입이면 `UserNotFoundException`(404, "사용자를 찾을 수 없습니다."), 비밀번호 불일치면 지금처럼 401 `INVALID_CREDENTIALS`("이메일 또는 비밀번호가 올바르지 않습니다.")를 던진다. 두 문구 모두 `ErrorCode`에 이미 있어서 새 코드가 필요 없다.
  - 프론트는 4xx에서 서버 문구를 그대로 표시하므로(현재 동작) 화면에서도 차이가 보인다.
- **PoC(공격 재현)**
  - `POST /api/auth/login`에 후보 이메일 목록과 임의 비밀번호를 넣는다 → 취약 모드에서 404/401 차이로 가입자를 추린다 → 추린 계정에 3-1·3-2와 연계해 대입한다.
- **진단 포인트**
  - 존재 계정·미존재 계정·잠긴 계정의 상태코드, 본문, 응답 시간 차이(BCrypt 연산 유무)를 비교한다.

## [3-5] 검색엔진 정보 노출 가능성

- **가이드 정의**: 검색 엔진에 의해 공격에 필요한 정보(시스템, 개인정보 등)가 검색되면 해킹의 빌미가 될 수 있다. 대응방안은 사이트 최상위에 `robots.txt`를 두고 크롤링을 거부하는 것이다(예: `User-agent: *` / `Disallow: /`).
- **준수기준 / 오너 / 플래그ID**: 일반 / P4 / `"3-5"`
- **대상 위치**
  - `FE/public/` (현재 `favicon.svg`만 있음 → `dist/` 루트로 복사됨)
  - `FE/index.html` (`<meta name="robots">` 없음)
  - `FE/nginx/*/default.conf.template` `location /`
- **🟢 현재 코드**: 로그인과 가입 경로는 공개이며, 문서 화면은 프런트 인증 가드와 백엔드 인가를 거친다. `robots.txt`와 `noindex`는 기준 소스에 없다. 크롤링 정책과 민감 페이지 접근통제는 각각 확인한다.

```text
# FE/public/robots.txt (권고 — 안전 기준선, 배포 빌드 포함)
User-agent: *
Disallow: /
```

- **🔴 취약 코드 패턴 (토글 on — `lab` 모드 빌드 전용)**
  - ⚠️ 취약 파일을 `FE/public/`에 넣으면 안 된다. Vite는 `public/`을 **모든 빌드**에 그대로 복사하므로 배포본에도 들어간다. lab 전용 정적 파일은 `FE/public-lab/`에 두고, `vite.config.js`에서 `publicDir: mode === 'lab' ? 'public-lab' : 'public'`으로 고른다. `public-lab/`에는 lab에서도 필요한 `favicon.svg`를 함께 둔다.
  - `public-lab/robots.txt`에 숨기고 싶은 경로를 나열해서 오히려 경로 정보를 노출한다.

```text
User-agent: *
Disallow: /admin
Disallow: /api/actuator
Disallow: /backup/
Disallow: /preview
```

  - `index.html`의 `<head>`에 표시 주석 `<!-- LAB_HEAD -->` 한 줄을 둔다. `vite.config.js`에 작은 플러그인(`transformIndexHtml`)을 넣어, `mode === 'lab'`일 때만 이 표시를 `FE/lab/head.html` 내용으로 바꾼다. `head.html`에는 `<meta name="robots" content="index,follow">`와 내부 API 설명 주석을 넣는다. 배포 빌드에서는 표시 주석만 남고 아무것도 들어가지 않는다.
- **PoC(공격 재현)**
  - `GET /robots.txt` → `Disallow` 경로를 차례로 접근한다(3-6, 3-4와 연계).
  - 검색엔진 `site:<도메인>` 질의로 수집된 페이지를 확인한다(실서비스 한정 — lab은 로컬이므로 생략).
- **진단 포인트**
  - `robots.txt` 존재 여부와, 그 안에 민감 경로가 노출되는지 확인한다.

## [3-6] 백업 파일 및 테스트 파일 존재 여부

- **가이드 정의**: 설치 시 생성되는 디폴트 페이지나 개발·운영 중 생긴 백업·테스트 파일을 방치하면, 시스템 정보 획득과 2차 공격에 악용될 수 있다. 대응방안은 운영에 필수적인 파일 외 불필요한 페이지를 모두 제거하고, 운영 파일은 권한·인증 모듈로 보호하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P4 / `"3-6"`
- **대상 위치**
  - `FE/src/routes/AppRouter.jsx` (`previewRoutes` — `import.meta.env.DEV`일 때만 `/preview` 생성)
  - `FE/vite.config.js` (`build.sourcemap` 미설정 = 기본 off)
  - `FE/src/preview/PreviewPage.jsx`, `FE/mock/server.js`, `FE/docs/`
  - `FE/.dockerignore` (mock, deploy, k8s, `.env*` 제외), `FE/.gitignore` (`backup*.sql`)
  - `FE/Dockerfile` (빌드 산출물 `dist`만 nginx로 복사)
- **🟢 안전 코드(현재)**: 미리보기 화면은 개발 서버에서만 생기고 배포 빌드에 들어가지 않는다. 목 서버·배포 설정·문서는 이미지에 들어가지 않고, 백업 SQL은 git에서 제외한다. 프로덕션 빌드는 소스맵을 만들지 않는다(Vite 기본값).

```jsx
const previewRoutes = import.meta.env.DEV
  ? [{ path: '/preview', lazy: () => import('../preview/PreviewPage').then((m) => ({ Component: m.default })) }]
  : [];
```

- **🔴 취약 코드 패턴 (토글 on — `lab` 빌드 전용)**
  - `previewRoutes` 조건을 `import.meta.env.DEV || import.meta.env.MODE === 'lab'`로 바꿔서 lab 빌드에도 `/preview`를 노출한다. `MODE`는 Vite가 기본 제공하는 값이라 env 파일이 필요 없다.
  - `FE/public-lab/backup/`에 `doqflow_backup_2026.sql`(더미 데이터·더미 해시만), `default.conf.template.bak`, `application.yaml.old`(FAKE-LAB 값)를 넣는다. `FE/public/`에는 넣지 않는다(3-5의 ⚠️ 참고).
  - `vite.config.js`에 `build.sourcemap: mode === 'lab'`을 넣어 lab 빌드에서만 `.map` 파일로 원본 소스를 노출한다.
  - lab 이미지는 `npm run build -- --mode lab`으로 빌드한다. 배포 워크플로(`deploy.yml`)와 `Dockerfile`은 `npm run build`(production 모드)라 lab 내용이 들어가지 않는다.
- **PoC(공격 재현)**
  - `GET /preview`, `GET /backup/doqflow_backup_2026.sql`, `GET /assets/index-*.js.map`.
  - 흔한 이름 사전(`.bak`, `.old`, `~`, `.swp`, `backup.zip`)으로 강제 브라우징한다.
- **진단 포인트**
  - 디렉터리·파일 사전 스캔(dirsearch, ffuf)과 소스맵 존재 여부를 확인한다. SPA는 없는 경로도 `index.html`(200)을 돌려주므로 응답 크기·Content-Type으로 진짜 파일을 구분한다.

## [7-1] Client Request Method

- **가이드 정의**: PUT, DELETE 등 불필요한 메소드가 활성화되어 있으면 악성파일 업로드나 중요파일 삭제 등 웹 사이트 변조 가능성이 있다. 대응방안은 운영에 필수적인 메소드(GET, POST, HEAD, OPTIONS) 외에 쓰지 않는 메소드(PUT, DELETE, TRACE 등)를 제거하는 것이다. 서비스·운영 영향도를 확인하고 적용한다.
  - 이 앱 적용 시 주의: REST API라 PATCH·DELETE를 정상 기능으로 쓴다(문서 수정·삭제, 버전 삭제, 열람자 회수). 가이드 문구만 보면 "필수 외"에 해당하지만, 인가로 보호되는 정상 기능이므로 진단 결과에는 "서비스상 필요 — 예외"로 사유를 적는다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P4 / `"7-1"` (백엔드 변경분은 홍서연 cross-review)
- **대상 위치**
  - `FE/nginx/http/default.conf.template`, `FE/nginx/https/default.conf.template` (`location /`, `location /api/`)
  - `BE/security/SecurityConfig.corsConfigurationSource()` (`setAllowedMethods` — 현재 설정 참고, 7-1에서 수정하지 않음)
  - 내장 Tomcat 기본값(TRACE 비활성), Spring Security 기본 방화벽(`StrictHttpFirewall` — 허용 메소드 외 요청 거부)
  - 신규 `LabServerConfig` (`lab` 프로필, P4)
- **🟢 안전 코드(현재)**
  - API는 REST 설계상 GET·POST·PATCH·DELETE를 쓴다(DELETE는 문서·버전·권한 삭제에 필요). CORS는 이 메서드와 OPTIONS만 허용한다.
  - CORS 허용 목록은 교차 출처 요청에 적용한다. nginx 설정, Tomcat·Spring Security의 메서드 처리, 외부 응답 상태코드를 구분하고 실제 응답은 기동 후 기록한다.

```java
config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
```

  - **잠재**: nginx `location /api/`에 메서드 제한(`limit_except`)이 없다. 백엔드에 새 메서드 매핑이 생기면 그대로 열린다. 권고(안전 분기에 추가): `limit_except GET POST PATCH DELETE OPTIONS { deny all; }`.
- **🔴 취약 코드 패턴 (토글 on)**
  - 백엔드(`LabServerConfig`, `lab` 프로필 빈, P4): 두 가지를 함께 켠다. 하나만 켜면 TRACE가 계속 막힌다.
    - `WebServerFactoryCustomizer<TomcatServletWebServerFactory>`로 `connector.setAllowTrace(true)`
    - Spring Security 방화벽에서 모든 메소드 허용: `StrictHttpFirewall`의 `setUnsafeAllowAnyHttpMethod(true)`를 설정한 `HttpFirewall` 빈
  - `SecurityConfig`의 CORS 설정은 바꾸지 않는다(P3 파일). CORS는 브라우저의 교차 출처 요청만 제한하고 서버가 받는 메소드를 정하지 않으므로, 7-1 재현과 관계가 없다.
  - `lab` nginx 템플릿(선택): 정적 경로에 `dav_methods PUT DELETE;`를 설정한다. nginx-unprivileged 이미지는 웹 루트에 쓰기 권한이 없으므로, 쓰기 가능한 별도 디렉터리를 `location`으로 지정해야 PUT이 성공한다.
- **PoC(공격 재현)**
  - `curl -i -X OPTIONS -H "Authorization: Bearer <토큰>" https://<lab-host>/api/documents` → `Allow` 헤더로 열린 메소드를 확인한다. (토큰이 없으면 인증 단계에서 401이 먼저 난다.)
  - `curl -i -X TRACE http://localhost:8080/api/actuator/health -H "X-Test: 1"` → 취약 모드에서 요청 라인·헤더가 응답에 반사된다. 안전 모드는 405. **nginx를 거치면 nginx가 먼저 405를 주므로 백엔드(8080)에 직접 보낸다**(로컬 lab). 인증 없이 열린 경로(`/actuator/health`)를 쓰면 토큰이 필요 없다. **주의**: 최신 Tomcat은 TRACE 응답에서 `Authorization`·`Cookie` 등 민감 헤더를 **제외**하고 반사한다. 따라서 "쿠키 탈취(XST)"는 이 스택에서 재현되지 않는다. PoC의 의미는 "불필요한 TRACE 메소드가 열려 있고 요청 정보가 에코된다"까지다.
  - `curl -i -X PUT --data-binary @test.html https://<lab-host>/<dav 경로>/test.html` (선택 — nginx `dav_methods`를 설정했을 때만).
- **진단 포인트**
  - 경로별 OPTIONS 응답과 실제 PUT·DELETE·TRACE 응답 코드를 비교한다. "필요해서 연 DELETE"(이 앱은 문서·버전 삭제에 DELETE를 정상 사용)와 "의도치 않게 열린 메서드"를 구분해서 기록한다.

## [7-2] 파일 목록화 가능성

- **가이드 정의**: 웹 서버 설정 미흡으로 디렉터리 검색 기능이 활성화되어 있으면 해당 디렉터리의 모든 파일 리스트가 출력되어 웹 서버 구조와 주요 설정 파일이 유출될 수 있다. 대응방안은 디렉터리 인덱싱을 끄는 것이다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P4 / `"7-2"`
- **대상 위치**
  - `FE/nginx/http/default.conf.template`, `FE/nginx/https/default.conf.template` (`location /` — `root /usr/share/nginx/html; try_files $uri /index.html;`)
  - 업로드 저장소 `/app/uploads`(백엔드 컨테이너 볼륨, 웹으로 서빙 안 함)
- **🟢 안전 코드(현재)**: nginx `autoindex`는 기본 off이고 설정에도 없다. 없는 경로는 `try_files`로 `index.html`이 나간다. 업로드 파일은 웹 서버 경로 밖에 저장한다.
- **🔴 취약 코드 패턴 (토글 on — `lab` nginx 템플릿)**

```nginx
# === [VULN 7-2] guideline:7-2 | owner:P4 | START ===
location /assets/ {
    root /usr/share/nginx/html;
    autoindex on;              # 🔴 빌드 산출물 목록 노출 (3-6 소스맵·백업과 연계)
}
location /backup/ {
    root /usr/share/nginx/html;
    autoindex on;
}
# === [VULN 7-2] END ===
```

- **PoC(공격 재현)**
  - `GET /assets/`, `GET /backup/` → 안전 모드는 SPA `index.html`, 취약 모드는 `Index of /assets/` 목록.
- **진단 포인트**
  - 알려진 디렉터리(`/assets/`, `/static/`, `/backup/`, `/uploads/`) 끝에 `/`를 붙여 요청하고, 응답에 `Index of`가 있는지 확인한다.

## [7-3] 서버 헤더정보 노출

- **가이드 정의**: 응답 헤더로 웹 서버나 웹 애플리케이션 서버의 종류·버전이 노출되면 다른 공격에 이용될 수 있다. 대응방안은 HTTP 응답 헤더 Server 항목에 소프트웨어 종류·버전이 나타나지 않도록 설정하는 것이다.
- **준수기준 / 오너 / 플래그ID**: 일반 / P4 / `"7-3"` (백엔드 설정 변경분은 홍서연 cross-review)
- **대상 위치**
  - `FE/nginx/http|https/default.conf.template` 첫 줄 `server_tokens off;`
  - `BE-res/application.yaml` (`server.server-header` 미설정 → Spring Boot 기본으로 Server 헤더 없음)
  - `FE/Dockerfile` (`nginxinc/nginx-unprivileged:1.30-alpine`)
- **🟢 현재 코드**: nginx 템플릿의 `server_tokens off`는 버전 표기를 제한한다. 응답에 남는 서버 제품명과 최종 서버 헤더는 배포 경로에서 확인한다.

```nginx
server_tokens off;
```

  - 참고: `Server: nginx` 문자열 자체는 남는다. 완전히 숨기려면 `headers-more` 모듈이 필요하다(선택 권고).
- **🔴 취약 코드 패턴 (토글 on)**
  - `lab` nginx 템플릿: `server_tokens on;` → `Server: nginx/1.30.x`.
  - `application-lab.yaml`: `server.server-header: "Apache-Tomcat/11.0 (FAKE-LAB)"`(실제 스택이 Tomcat 11이므로 버전을 맞춰 둔다). nginx `location /api/`에 `proxy_pass_header Server;`를 추가해서 백엔드 헤더를 통과시킨다.
  - `LabServerConfig`(P4)에 응답 헤더 `X-Powered-By: Spring Boot 4.0 (FAKE-LAB)`를 붙이는 필터 빈을 추가한다.
- **PoC(공격 재현)**
  - `curl -sI https://<lab-host>/` 및 `/api/auth/login` → `Server`, `X-Powered-By` 확인 → 해당 버전의 CVE를 검색한다.
- **진단 포인트**
  - 정상·오류(404, 405, 502) 응답 모두에서 `Server`, `X-Powered-By`, `X-AspNet-Version` 등 버전 정보 헤더와 에러 페이지 하단 서명을 확인한다.

## [7-4] 취약한 보안설정

- **가이드 정의**: 보안상 취약한 서버 설정, 패치·라이브러리·모듈·알고리즘·프레임워크를 쓰면 시스템 권한과 정보를 획득당할 수 있다. SSL 인증서 관리가 미흡하면 MITM이 가능하다. 대응방안은 불필요한 서비스·구성요소를 최소화하고, 취약 버전을 패치하며, 공인 CA 인증서를 쓰는 것이다(인프라 담당 조치 사항).
- **준수기준 / 오너 / 플래그ID**: 일반 / P4 / `"7-4"`
- **대상 위치**
  - `FE/nginx/https/default.conf.template` (`ssl_protocols`, CSP·X-Frame-Options·nosniff·Referrer-Policy·HSTS 헤더, `/internal/`·`/api/actuator` 차단)
  - `FE/nginx/http/default.conf.template` (HTTP 전용 — HSTS 없음)
  - `BE-res/application.yaml` `management.endpoints.web.exposure.include: ${ACTUATOR_EXPOSURE:health,info}`
  - `FE/k8s/*.yaml` (`securityContext.runAsNonRoot`, `seccompProfile`), `FE/k8s/frontend.yaml` (`type: LoadBalancer`)
  - `DoQFlow_AI_Backend/Dockerfile` (uid 10001 비 root 실행), `FE/Dockerfile` (`nginx-unprivileged`)
  - 의존성: `pom.xml`, `FE/package.json`
- **🟢 안전 코드(현재)**
  - HTTPS 템플릿은 TLS 1.2/1.3과 HTTP→HTTPS 리다이렉트를 설정한다. 검토한 K8s ConfigMap은 HTTP 템플릿을 사용하므로 운영 TLS 종료 위치와 HSTS·쿠키 응답은 기동 후 확인한다.
  - CSP(`script-src 'self'`, `frame-ancestors 'none'`), `X-Frame-Options DENY`, `nosniff`, `Referrer-Policy no-referrer`.
  - actuator는 health,info만 노출하고 nginx에서 외부 차단한다. 컨테이너는 비 root로 실행하고, DB·AI·백엔드 서비스는 ClusterIP로 내부 전용이다.

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; ... frame-ancestors 'none'" always;
add_header X-Frame-Options DENY always;
add_header Strict-Transport-Security "max-age=86400" always;
location /api/actuator { return 404; }
```

  - 개선 권고(현재 미흡): HSTS `max-age=86400`(1일)은 짧다. 권고는 `31536000; includeSubDomains`다.
- **🔴 취약 코드 패턴 (토글 on — `lab` 설정 파일)**
  - `lab` nginx 템플릿(https 템플릿을 바탕으로 만든다): 보안 헤더를 전부 제거한다(1-1 XSS·클릭재킹 실습용). `location /api/actuator` 차단도 제거한다.
  - 구버전 TLS: `ssl_protocols TLSv1 TLSv1.1 TLSv1.2;`만 바꾸면 **허용되지 않는다.** 이미지의 OpenSSL 3은 보안 수준 기본값에서 TLS 1.0·1.1을 막기 때문이다. `ssl_ciphers 'DEFAULT:@SECLEVEL=0';`을 함께 넣어야 재현된다.
  - `lab` 환경변수·`application-lab.yaml`(P4): `ACTUATOR_EXPOSURE=*`, `management.endpoint.env.show-values: ALWAYS` → `/api/actuator/env`, `/api/actuator/heapdump` 노출. 힙덤프에는 메모리의 설정값이 그대로 담기므로 lab 환경 변수는 **전부 FAKE-LAB 더미**여야 한다.
  - 자체 서명 인증서를 사용한다(로컬 lab에는 공인 인증서가 없으므로 어차피 필요하다). 인증서는 `CERT_DIR`로 마운트하고 키 파일은 커밋하지 않는다.
- **PoC(공격 재현)**
  - `curl -sI https://<lab-host>/` → 보안 헤더 유무 확인.
  - `nmap --script ssl-enum-ciphers -p 443 <lab-host>` 또는 `testssl.sh` → TLS 1.0/1.1 허용 여부.
  - `GET /api/actuator/env`, `GET /api/actuator/heapdump` — **로그인한 아무 계정(사원 포함)의 토큰**으로 호출한다. `SecurityConfig`는 `health`·`info`만 무인증으로 열고 나머지는 인증만 요구하기 때문이다. 즉 취약 모드의 발견 내용은 "일반 사용자도 운영 정보·힙덤프를 받을 수 있다"가 된다.
  - 클릭재킹: 외부 페이지 `<iframe src="https://<lab-host>/">` 로드 여부.
- **진단 포인트**
  - 보안 헤더 체크(securityheaders 기준), TLS 프로토콜·암호군·인증서 체인, 관리용 엔드포인트 노출, 의존성 취약점(`npm audit`, OWASP Dependency-Check)을 확인한다.

## [8-1] 취약점 진단 항목에 정의되지 않은 취약점 (선택)

- **가이드 정의**: 27개 항목에 포함되지 않는 새로운 취약점·공격기법(Zero-Day 포함)이 있을 수 있다. 대응방안은 보고서에 별도로 첨부한다.
- **준수기준 / 오너 / 플래그ID**: - / P2 / `"8-1"`
- **주제**: RAG 질의응답의 **간접 프롬프트 인젝션 + 답변 근거 범위 이탈**
- **대상 위치**
  - `BE/controller/AiController.chat()` → `BE/service/ChatService.ask()`, `answer()`, `withinScope()`
  - `BE/security/AccessPolicy.accessibleVersionIds()` (검색 scope)
  - `BE/security/RateLimiter.checkChat()` (분당 20회)
  - AI 모듈 프롬프트는 별도 레포(`DoQScale_LLM2`) — 이 문서 범위 밖
- **🟢 안전 코드(현재)**: 질문마다 읽을 수 있는 문서의 최신 버전만 scope로 넘긴다. AI가 돌려준 `sourceVersionIds`를 scope와 **다시 대조**해서, 하나라도 범위 밖이면 답변 전체를 폐기하고 감사 로그(`SOURCE_CHECK_FAILED`)를 남긴다.

```java
// ChatService.answer() — 범위 밖 근거가 있으면 "답을 찾지 못했습니다"로 대체
log.warn("SOURCE_CHECK_FAILED sessionId={} scopeSize={} outOfScopeVersionIds={}", ...);
audit.log(AuditEventType.SOURCE_CHECK_FAILED, AuditResult.FAILURE, ...);
return writer.saveNoAnswer(sessionId, checked, NO_ANSWER_MESSAGE);
```

- **🔴 취약 코드 패턴 (토글 on)** — 분기 위치: `ChatService.ask(AppUser, Long, String)` (P2)
  - **검색 범위 확대(핵심, 백엔드 단독 재현)**: `accessPolicy.accessibleVersionIds(me.getId())` 대신, 권한과 상관없이 **모든 문서의 최신 READY 버전 ID**를 scope로 넘긴다. 이를 위해 `DocumentVersionRepository`(P2)에 권한 조건 없는 조회 메서드를 추가한다.
    - AI 모듈은 받은 scope 안에서만 검색하므로, scope가 넓어지면 권한 밖 문서도 검색되고 답변 근거로 쓰인다.
    - 근거 재대조(`withinScope`)는 넓어진 scope 기준으로 대조하므로 통과해 버린다. 재대조 코드를 지우지 않아도 재현된다.
  - 참고: 재대조(`withinScope`)만 지우는 변형은 이 앱에서 **관찰되지 않는다**. AI 모듈이 scope 밖 버전을 돌려줄 일이 없기 때문이다. 방어 계층을 하나 없애는 코드 리뷰 실습용으로만 쓴다.
  - **(AI 모듈 의존 — 이 문서 범위 밖)** 문서 본문을 통한 간접 프롬프트 인젝션은 AI 모듈(`DoQScale_LLM2`)의 프롬프트 구성이 그 지시문을 따를 때만 성립한다. 이 레포만으로는 재현되지 않으므로 AI 모듈 점검 항목으로 분리한다.
- **PoC(공격 재현)**
  - 팀장 B가 사원 A를 초대하지 않은 문서에 고유 문구(예: "FAKE-LAB 분기 매출 목표 7억")를 넣어 올린다. 사원 A가 채팅에서 그 문구에 대해 질문한다.
  - 안전 모드: "문서에서 답을 찾지 못했습니다." 취약 모드: 답변과 근거(`sources`)에 B의 문서 이름·내용이 나온다.
  - 간접 인젝션: 위 "AI 모듈 의존" 전제가 충족될 때만 확인한다.
- **진단 포인트**
  - 답변 근거(`sources`)의 문서가 질문자의 열람 권한 안에 있는지 교차 확인한다. 감사 로그에 `SOURCE_CHECK_FAILED`가 남는지, 취약 모드에서 그 방어가 사라지는지 확인한다. 간접 인젝션은 AI 모듈 점검으로 분리한다.

---

## 부록. 변경 범위와 검증 결과

```bash
# 로컬 작업 폴더 기준으로 변경 파일과 담당 항목의 매핑을 확인한다.
git -C backend status --short
git -C frontend status --short
```

기존 기능 파트는 필수 22개와 선택 `8-1`을 다룬다. Part C의 신규·보강 4개까지 포함하면 필수 26개다. 기능별 검증 결과는 항목·PR·테스트 결과와 함께 기록한다.

---

## C-1. 전체 기능 → 취약점 매핑 (한눈에)

### (A) 원래 있던 기능 리스트 & 들어가는 취약점 (기존 — 세진님 문서 상세)

| 영역 | 기능 (백엔드 컨트롤러 경로, 외부 호출 시 `/api` 접두어) | 관련 항목 |
|---|---|---|
| 인증 | 회원가입 `POST /auth/signup` | 3-1(패스워드 정책), 4-5(권한 상승·SEC-B), 3-3(가입 여부 노출) |
| 인증 | 로그인 `POST /auth/login` | 3-2(실패 횟수), 6-2(계정 열거), 4-2(토큰) |
| 인증 | 재발급/로그아웃 `POST /auth/refresh·logout` | 4-2(회전·파기), 4-1(쿠키/스토리지) |
| 사용자 | 내 정보 `GET /users/me` | 5-2(응답 내 주요정보) |
| 사용자 | 이메일 조회 `GET /users/lookup` | 3-3(계정 파악) |
| 문서 | 생성 `POST /documents`, 수정·삭제 `PATCH·DELETE /documents/{documentId}` | 4-3(접근제어), 4-5(권한 상승) |
| 문서 | 목록 `GET /documents` | 1-2(Injection — `sort`) |
| 버전 | 업로드 `POST …/versions` | 2-1(악성 파일 업로드) |
| 버전 | 원문 보기 `GET …/versions/{n}/content` | 1-3(IDOR), 1-1(저장형 XSS 렌더) |
| 열람권한 | 초대 수락 `POST /invitations/{id}/accept` | 1-3(남의 초대 조작) |
| 질의응답 | 채팅 `POST /ai/chat` | 8-1(근거 범위 이탈 — 선택) |
| 전역/정적 | 에러·헤더·설정·정적파일 | 6-1, 7-1, 7-2, 7-3, 7-4, 3-5, 3-6, 5-1 |

기존 기능 상세는 이 문서의 Part A·B 항목별 절을 참조한다.

### (B) 리드가 추가·보강한 기능과 실제 매핑

| 번호 | 기능 | 실제 위치 | 상태 |
|---|---|---|---|
| 1-4 | URL 원본 가져오기·도움말 | `BE/controller/DocumentImportController.java`, `HelpController.java`; `BE/service/UrlImportService.java`, `UrlFetchClient.java`, `UrlImportPolicy.java`; `FE/src/components/document/UrlImportPanel.jsx`, `pages/HelpPage.jsx` | 정상 기능 구현 |
| 1-5 | 로그인 복귀 경로 검증 | `FE/src/routes/ProtectedRoute.jsx`, `PublicOnlyRoute.jsx`, `utils/safeReturnPath.js` | 기존 보강 + returnUrl 지원 |
| 2-2 | 버전 원본 다운로드 | `BE/controller/FileDownloadController.java`, `service/FileDownloadService.java`; `FE/src/services/versionService.js`, `components/document/VersionTable.jsx`, `utils/download.js` | 정상 기능 구현 |
| 3-4 | 팀장 전용 문서 관리 | `BE/controller/TeamManagementController.java`, `service/TeamManagementService.java`; `FE/src/routes/LeaderRoute.jsx`, `pages/TeamManagementPage.jsx` | 사원/팀장 체계로 대체 적용 |
| 4-5 선행 | 팀장 가입 키 검증 | `BE/service/SignupKeyPolicy.java`, `AuthService.java` | 정상 baseline 보강 |

**위 구현 완료는 취약 코드 주입/공격 재현 완료가 아니다.** 개별 취약 분기는 P1~P4 후속 작업이다.
공유 파일 `AppRouter.jsx`, `Sidebar.jsx`, `versionService.js`, `DocumentDetailPage.jsx`, `ErrorCode.java`,
`DocumentRepository.java`, `AuthService.java` 변경을 먼저 리드 개발 브랜치에서 받아 충돌을 줄인다.

---

# Part C — 신규·보강 기능 상세

## [1-4] SSRF / File Inclusion 공격 가능성

**외부 URL로 문서 버전 가져오기**

- API: `POST /api/documents/{documentId}/versions/from-url`, JSON `{ "url": "https://허용출처/문서.txt" }`.
- 화면: 문서 상세의 등록자 전용 업로드 영역 → ‘URL에서 버전 가져오기’.
- 팀장 여부와 문서 등록자 권한을 네트워크 요청 전에 확인한다. 저장 직전 기존 업로드 권한도 다시 확인한다.
- `URL_IMPORT_ALLOWED_HOSTS`에 정확하게 등록한 도메인의 HTTPS/443만 허용한다. 빈 목록은 모두 거절한다.
- 사용자정보 포함 URL·IP 리터럴·임의 포트·프래그먼트는 거절한다. 와일드카드·하위 도메인 자동 허용은 없다.
- 실제 소켓 연결에 사용하는 DNS resolver에서 공인 주소만 허용한다. 사설·루프백·링크로컬·멀티캐스트·주요 특수 IPv4/IPv6 대역을 차단한다.
- 리다이렉트·자동 재시도·쿠키 전달·자동 압축 해제를 사용하지 않는다. TLS 인증서 검증을 유지한다.
- 연결 3초, 응답/소켓 10초, 요청 취소 타이머 20초. DNS 해석 자체의 OS 지연까지 절대 시간으로 보장하는 것은 아니다.
- Content-Length와 실제 수신 바이트를 모두 제한한다(20MB). 초과 시 연결을 취소한다.
- URL 마지막 경로의 파일명을 쓰며 기존 `VersionService.uploadBatch()`의 확장자·매직넘버·UTF-8·크기·중복 검증과 AI 후처리를 재사용한다.
- 원격 실패/차단은 502 `URL_IMPORT_FAILED`, 잘못된 URL은 400, 크기 초과는 413. 원격 응답과 URL 비밀값을 그대로 노출하지 않는다.
- 네트워크 실패·파일 검증 실패 시 새 버전이 저장되지 않는다. AI 후처리 실패는 기존 업로드 상태 처리와 동일하다.
- 내부 AI Module URL을 사용자 입력으로 가져오는 기능이 아니다. `AI_INTERNAL_KEY`를 외부 출처에 보내지 않는다.

**도움말**

- API: `GET /api/help?page=guide|terms|privacy`, 화면 `/help`.
- `HelpController`의 고정 키로 안내를 선택하며 입력 문자열을 파일 경로에 결합하지 않는다.
- 미등록 키·상위 경로 문자열은 404. 로그인하지 않으면 401. 화면은 텍스트로 렌더링한다.
- terms/privacy는 실습 안내이며 법적 운영 약관/개인정보 처리방침을 작성 완료했다는 의미가 아니다.

**검증 위치**: `UrlImportPolicyTest`, `UrlFetchClientTest`, `UrlImportServiceTest`,
`ApiControllerIntegrationTest.importsUrlUsingExistingPipeline()`.
정책·크기 검증은 단위 테스트, 권한·저장은 실제 DB 통합 테스트(외부 fetch와 AI 응답은 대체)로 구분한다. 최종 Docker 환경에서는 raw.githubusercontent.com의 실제 공개 문서 가져오기·저장·다운로드도 확인했다.

## [1-5] 검증되지 않은 리다이렉트와 포워드

- 기존 `state.from` 로그인 복귀에 `safeReturnPath()`를 적용했다. `?version=`과 `#fragment`도 보존한다.
- `PublicOnlyRoute`는 `state.from` 우선, 없으면 로그인 URL의 `returnUrl`을 읽는다.
  예: `/login?returnUrl=%2Fdocuments%2F7%3Fversion%3D2`.
- 외부 URL·프로토콜 상대 URL·역슬래시·제어문자·인코딩 우회·로그인/가입 반복 경로는 `/`로 대체한다.
- 정상 경로만 이동한다고 해서 문서 권한을 얻는 것은 아니다. 최종 데이터 접근은 기존 서버 인가를 따른다.
- **`/go` 서버 리다이렉트 API와 서버 forward 기능은 구현하지 않았다.** 이 항목의 실제 매핑은 로그인 복귀다.
- 검증: `FE/tests/safeReturnPath.test.js`.

## [2-2] 중요 정보 파일 다운로드 가능성

- API: `GET /api/documents/{documentId}/versions/{versionNo}/download`.
- 기존 화면의 documentId/versionNo를 그대로 사용한다. 별도 versionId 노출이나 `file/path` 입력이 필요 없다.
- 화면: 문서 상세 버전 목록의 ‘다운로드’. 등록자와 초대를 수락한 열람자 모두 사용할 수 있다.
- 서버가 `AccessPolicy.readOrNotFound()`로 먼저 확인하고 DB의 storedFilename으로만 파일을 찾는다.
- 같은 버전 디렉터리 안의 실제 일반 파일만 허용한다. 경로 구분자·상위 경로·심볼릭 링크 이탈을 거절한다.
- 응답: 바이너리 스트림, `application/octet-stream`, `Content-Disposition: attachment`, `Cache-Control: no-store`, `nosniff`.
- 토큰은 Authorization 헤더로 전달한다. URL에 토큰을 넣지 않는다. 파일명은 경로·제어문자를 정리한다.
- 미인증 401, 권한 없음·없는 문서/버전/파일 404. AI 분석 실패와 별개로 저장된 원본은 받을 수 있다.
- FE는 Blob 오류 응답도 기존 오류 봉투로 파싱하고, 401 갱신 흐름을 재사용한다.
- 검증: `FileDownloadServiceTest`, `ApiControllerIntegrationTest.downloadsOriginalWithDocumentAcl()`, `FE/tests/download.test.js`.

## [3-4] 관리자 페이지 분리 여부 — 팀장 관리 기능으로 대체 적용

- 원문은 시스템 관리자 페이지를 말한다. DoQFlow에는 ADMIN을 추가하지 않고 **사원/팀장**으로 적용한다.
- 팀장 전용 화면 `/manage`, API `GET /api/management/documents`를 일반 문서 화면과 경로로 분리했다.
- 프론트 `LeaderRoute`는 안내용이고, 실제 API는 DB의 현재 직급으로 팀장 여부를 확인한다.
- API 미인증 401, 사원 직접 호출 403. 반환 목록은 팀장이 직접 등록한 문서만이며 페이징을 적용한다.
- ‘관리하기’는 기존 문서 상세로 연결된다. 수정·삭제·버전 추가·초대는 기존 소유자 검사를 유지한다.
- 팀장이 다른 팀장 문서를 자동으로 관리할 수 있는 전역 권한을 주지 않는다. 현재 스키마에 별도 팀 조직 ACL은 없다.
- 별도 관리자 로그인·도메인·포트·ADMIN 컬럼을 구현했다는 의미가 아니다. 체크리스트 평가 시 이 대체 적용 범위를 설명한다.
- **실시간 취약점 토글 관리자 화면이 아니다.** env 설정은 이 화면에서 변경할 수 없다.
- 검증: `ApiControllerIntegrationTest.managementRequiresLeadAndFiltersOwnership()`.

---

## 부록. 완료 기준과 팀 인계

- 정상 기능 구현: env 읽기 기반, 1-4·1-5·2-2·3-4의 위 범위, 4-5 가입 키 baseline.
- 아직 미완료: 개별 취약 분기 주입·PoC 실행, P4 nginx lab/TLS/정적 파일 구성, 운영 산출물 제외 CI.
- 따라서 필수 26개는 **기능/설정 지점 매핑 범위**이며 26개 취약점 구현·재현 완료를 뜻하지 않는다.
- 1-6 고전적 Buffer Overflow/Format String은 현재 Java/JS의 동일 유형 재현 대상에서 제외한다. 8-1은 선택이다.
- 기존 22개 상세의 🔴 코드와 PoC는 팀 구현을 위한 설계 예시이며 실행 증적으로 취급하지 않는다.
- 팀원은 OFF 정상 테스트와 ON 해당 항목 테스트를 각각 기록한다. nginx·Vite·Spring 변경 적용 시점도 기록한다.
- 담당 파일이 겹치면 리드 baseline을 먼저 반영하고 한 항목씩 PR한다. 개인 포크 `main` 통합과 AWS 배포·팀 실습 레포 통합은 별도다.

### 검증 기록 (2026-11-24)

- 백엔드 단위·MariaDB 통합 테스트: **243개 통과, 실패/오류/건너뜀 0** (확장 기능 최초 전체 실행).
- 프론트: `npm test` 6개 통과, `npm run lint`, `npm run build` 통과.
- 로컬 Docker 4개 서비스 최종 빌드·기동 확인. Nginx 경유 로그인·잘못된 팀장 가입 키 거절·업로드·바이트 동일 다운로드·관리/도움말 API·URL 거절·실제 공개 HTTPS 문서 가져오기/다운로드·제거한 토글 API 404를 확인했다. 검증용 문서는 삭제했다.
- OPENAI_API_KEY가 없는 환경에서는 실제 OpenAI 색인·응답 성공을 검증하지 않았다. AI 서비스 기동과 모델 호출 성공은 구분한다.

### 세진님께 전달할 변경 요약

> 항목별 분기와 `vulnToggle.on(id)` / `useVulnFlag(id)`는 유지합니다. 설정 저장은 DB/관리자 화면 대신 env로 변경했습니다.
> 컴포넌트 밖에서는 `isVulnEnabled(id)`를 사용하고, 플래그 조회·변경 API는 없습니다.
> 변경 적용에는 BE 재시작/컨테이너 재생성과 FE 재빌드가 필요합니다. nginx lab 분리는 그대로 유지하되 별도 적용합니다.
> 역할은 사원/팀장 두 가지이며 3-4는 팀장 문서 관리 화면/API로 대체 적용했습니다.
> 신규 정상 기능과 4-5 가입 키 baseline의 실제 위치는 Part C와 매핑표를 기준으로 작업해 주세요.
