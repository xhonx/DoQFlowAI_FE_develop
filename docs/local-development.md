# 로컬 개발 설정 (2026-11-24)

실시간 `/lab` 화면, `/admin/vuln-flags` API와 DB 플래그 저장은 폐기했다.
설정은 시작 시 고정되며 기본값은 전부 off다. 프론트 훅과 백엔드 도우미의 기존
호출 형식은 유지하지만 네트워크/DB 조회와 실시간 변경은 없다.

- 백엔드: `.env.example` → `.env`에 `LAB_VULNS=`. 프로필은 실행 환경변수 `SPRING_PROFILES_ACTIVE=lab` 또는 백엔드 `.env`의 Spring 속성 `spring.profiles.active=lab`로 지정한다.
- 프론트: `.env.example` → `.env`. `VITE_LAB_VULNS=`, `npm run dev:lab`.
- 선택한 항목을 쉼표로 나열한다. 예: `1-1,2-2`. 개별 실행 시 양쪽 목록을 맞춘다.
- 백엔드 프로필에 `prod` 또는 `production`이 함께 있으면 전부 off.
- 프론트 기본 `dev`/`build`는 전부 off. `build:lab`은 lab 모드다.
- 설정 변경 후 백엔드 재시작, Vite 개발 서버 재시작 또는 프론트 재빌드가 필요하다.
- nginx 설정 변경은 별도 설정 적용/재기동이 필요하다. 이 목록만으로 nginx가 바뀌지 않는다.
- 이 변경은 플래그 읽기 기반만 제공한다. 실제 취약 분기는 아직 구현하지 않았다.
- off는 취약 코드의 산출물 제외를 뜻하지 않는다. 운영 배포는 별도 빌드/산출물 검사가 필요하다.
- 역할은 사원(1)/팀장(2)만 사용한다. `/manage`는 팀장 문서 관리이며 env 설정 화면이 아니다.
- V2 마이그레이션은 이력 호환을 위해 보존하며 V3가 사용하지 않는 `vuln_flags`만 삭제한다.
  회원/문서/버전 데이터는 삭제하지 않는다. 다른 개발자의 마이그레이션 번호와 충돌 여부를 확인한다.

Git에는 `.env.example`만 공유한다. 실제 키와 `.env`는 커밋하지 않는다.

## 팀원 첫 실행

새 작업 폴더에서 아래처럼 클론한다. Compose가 사용하는 폴더 이름을 유지한다.
LLM 원본은 읽기용으로 클론하며 이 작업에서 원본에 push하지 않는다. 비공개 저장소라면 읽기 권한이 필요하다.

```powershell
mkdir FinalPJT-DoQFlow
cd FinalPJT-DoQFlow
git clone --branch main https://github.com/xhonx/DoQFlowAI_FE_develop.git frontend
git clone --branch main https://github.com/xhonx/DoQFlowAI_BE_develop.git backend
git clone --branch main https://github.com/DoQFlowAI/DoQScale_LLM2.git llm
cd frontend/deploy
Copy-Item .env.local.example .env
```

새 `.env`의 빈 키를 채운 뒤 아래 Docker Compose 절차를 따른다. 기존 `.env`에는 복사 명령을 다시 실행하지 않는다.
팀장 가입에는 `SIGNUP_KEY_LEAD`, 실제 AI 기능에는 `OPENAI_API_KEY`도 설정한다.
담당 작업은 해당 프론트/백엔드 폴더에서 `git switch -c vuln/항목명`으로 브랜치를 만든 뒤 진행한다.
팀 실습 저장소의 PR 대상은 팀 합의에 따른다.

## Docker Compose로 한 번에 실행

폴더를 `frontend/`, `backend/`, `llm/ai/`로 나란히 둔다. 개인 fork의 원격 이름과 무관하게
위 로컬 폴더 이름을 사용한다. Docker Desktop의 Linux 엔진을 먼저 켠다.

`frontend/deploy`에서 `.env.local.example`을 `.env`로 복사하고 빈 비밀값을 채운다.
DB 비밀번호, 32바이트 이상의 JWT_SECRET, 16자 이상의 AI_INTERNAL_KEY가 필요하다.
로컬 DB 앱 계정은 마이그레이션 권한도 가진다. 운영 compose의 DML/DDL 계정 분리와 다르다.
기존 `.env`가 있다면 덮어쓰지 말고 필요한 값을 합친다.

```powershell
docker compose --env-file .env -f docker-compose.local.yml config --quiet
docker compose --env-file .env -f docker-compose.local.yml up -d --build
docker compose --env-file .env -f docker-compose.local.yml ps
```

접속: `http://localhost:8088`. HTTP 로컬 구성만 Refresh 쿠키 Secure=false다.
DB와 AI는 호스트 포트를 공개하지 않고, 프론트/백엔드도 127.0.0.1에만 바인딩한다.
이 파일은 AWS 배포용이 아니다. 로컬 전용 볼륨은 `doqflow-local` 프로젝트로 분리된다.

lab 설정은 같은 `.env`에서 `APP_MODE=lab`, `LAB_VULNS=1-1,2-2`처럼 선택한다.
Compose가 백엔드에는 런타임 변수, 프론트에는 빌드 인자로 같은 목록을 전달한다.
변경 후에는 아래 명령으로 프론트를 재빌드하고 백엔드 컨테이너를 재생성한다.
`docker compose restart`만으로는 바뀐 환경변수가 들어가지 않는다.

```powershell
docker compose --env-file .env -f docker-compose.local.yml up -d --build --force-recreate frontend backend
```

nginx는 현재 안전한 HTTP 템플릿을 사용한다. `LAB_VULNS`는 nginx 설정을 자동 변경하지 않는다.
nginx lab 템플릿/TLS 실습은 인프라 담당의 별도 설정이 필요하다.

AI_INTERNAL_KEY는 BE↔AI 인증용이며 같은 값을 Compose가 양쪽에 전달한다.
OPENAI_API_KEY는 AI에만 전달한다. 유효한 키 없이는 AI 색인/답변을 검증할 수 없다.
AI 코드 없이 키만 백엔드에 넣어서는 AI 기능이 실행되지 않는다.
원본 다운로드는 AI 분석 성공 여부와 독립적으로 저장된 원본을 제공한다.

DB 비밀번호는 최초 볼륨 생성 시 설정된다. 기존 볼륨이 있으면 env 값만 바꿔도 DB 계정이
바뀌지 않는다. 기존 데이터를 유지하며 계정 암호를 변경해야 한다. `down -v`는 데이터도
삭제하므로 일상적인 재시작 명령으로 사용하지 않는다.

## 추가 기능 위치

- `POST /api/documents/{documentId}/versions/from-url`: 팀장·등록자만 URL 원본 가져오기.
  `URL_IMPORT_ALLOWED_HOSTS`에 정확한 공개 호스트를 설정한다. 기본 빈 값은 모두 거절한다.
  HTTPS/443, 공인 DNS 주소, 인증서 검증, 리다이렉트 거절, 20MB 제한 후 기존 업로드 검증을 적용한다.
- `GET /api/help?page=guide|terms|privacy`, 화면 `/help`: 고정 안내만 선택한다.
- `GET /api/documents/{documentId}/versions/{versionNo}/download`: 문서 읽기 권한으로 원본을 받는다.
- `/login?returnUrl=...`: 검증된 내부 경로로만 복귀한다. 별도 `/go` API는 없다.
- `/manage`, `GET /api/management/documents`: 팀장만 본인이 등록한 문서를 관리한다.
- `SIGNUP_KEY_LEAD`: 팀장 가입 때 서버에서 검증한다. 없거나 틀리면 400, 사원 가입에는 불필요.

프론트에서 컴포넌트 밖의 플래그 조회는 `src/utils/vulnFlags.js`의 `isVulnEnabled(id)`를 사용한다.
기능 개발 기준은 양쪽 개인 `xhonx` 레포의 `main`이다. 팀원은 `main`을 클론한 뒤 담당 브랜치를 만든다.
원본 `DoQFlowAI` 조직에는 업로드하지 않는다. 개인 레포의 main push는 테스트만 실행하며, 원본 GHCR 업로드와 EC2 배포 작업은 건너뛴다.
실제 취약 분기 구현과 팀 실습 레포 통합은 후속 작업이다.
