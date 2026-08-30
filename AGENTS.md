<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GabojaGo Frontend Guide

이 문서는 팀원과 코딩 에이전트가 동일한 환경과 규칙으로 프론트엔드를 개발하기 위한 기준이다.

## Runtime

| 항목 | 프로젝트 기준 | 현재 확인된 로컬 환경 |
|---|---|---|
| Node.js | 20 (`.nvmrc`, CI 기준), 최소 20.9 | 24.7.0에서도 동작 확인 |
| npm | Node.js에 포함된 npm 사용 | 11.5.1 |
| Lock file | npm `package-lock.json`, lockfile v3 | 저장소에 포함 |

- 팀과 CI의 기준은 Node.js 20이다.
- Node.js 24에서도 개발할 수 있지만 Node.js 20에서 지원하지 않는 기능에 의존하지 않는다.
- 패키지 매니저는 npm만 사용하고 `package-lock.json`을 함께 커밋한다.
- 의존성 설치는 일반 개발 환경에서 `npm install`, CI에서는 `npm ci`를 사용한다.

## Frontend Stack

| 기술 | 버전 | 용도 |
|---|---|---|
| Next.js | 16.3.3 | App Router 기반 프론트엔드 및 Route Handler |
| React / React DOM | 19.2.8 | UI 구성 |
| TypeScript | 5.x | 정적 타입 검사 |
| Tailwind CSS | 4.x | 스타일링 |
| ESLint | 9.x | 코드 정적 검사 |
| eslint-config-next | 16.3.3 | Next.js 권장 ESLint 규칙 |

## Service Environment

프론트엔드가 연동하는 전체 서비스 환경은 다음과 같다.

| 구분 | 기술 및 버전 |
|---|---|
| Backend | Java 21, Spring Boot 4.1.1, Spring Data JPA |
| Database | MySQL 8.0.43, Flyway |
| Flight data | SerpAPI |
| Container | Docker, Docker Compose |
| Infrastructure | AWS EC2, EBS, Docker Hub |
| CI/CD | GitHub Actions, AWS IAM OIDC, AWS Systems Manager |

챗봇의 AI 모델과 자연어 조건 추출 방식은 아직 확정되지 않았다. 확정 전 특정 모델이나 API를 코드 구조에 고정하지 않는다.

## Project Structure

```text
src/
├── app/                  # App Router 페이지와 Route Handler
│   ├── api/auth/         # 백엔드 인증 API 프록시
│   ├── login/            # 로그인 페이지
│   └── signup/           # 회원가입 페이지
├── components/auth/      # 인증 화면 공통 컴포넌트와 폼
└── lib/                  # 클라이언트 유틸리티와 서버 프록시
```

- App Router를 사용한다. Pages Router를 함께 사용하지 않는다.
- 프로젝트 소스는 `src/` 아래에 작성한다.
- 내부 모듈 import에는 `@/*` alias를 우선 사용한다.
- 상태나 이벤트 처리가 필요한 최소 컴포넌트에만 `"use client"`를 선언한다.
- 백엔드 주소 및 서버 전용 환경변수는 Client Component에서 읽지 않는다.

## Backend Connection

로컬 브라우저가 EC2에 직접 접근하지 않고 Next.js Route Handler가 백엔드 요청을 중계한다.

```text
Browser
  -> Next.js /api/auth/*
  -> Route Handler
  -> BACKEND_API_URL=http://127.0.0.1:18080
  -> SSH tunnel
  -> EC2 backend 127.0.0.1:8080
```

로컬 환경변수는 프로젝트 루트의 `.env.local`에 둔다.

```dotenv
BACKEND_API_URL=http://127.0.0.1:18080
```

백엔드 API 기준은 다음과 같다.

| 기능 | Method | Frontend route | Backend route | Request body |
|---|---|---|---|---|
| 회원가입 | POST | `/api/auth/signup` | `/api/auth/signup` | `{ email, password, nickname }` |
| 로그인 | POST | `/api/auth/login` | `/api/auth/login` | `{ email, password }` |

인증 방식과 최종 응답 DTO는 백엔드 구현 후 확정한다. 현재 프록시는 백엔드의 상태 코드, 응답 본문, 인증 쿠키와 `Authorization` 헤더를 전달한다.

## Commands

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev

# 정적 검사
npm run lint

# 프로덕션 빌드
npm run build

# 프로덕션 서버
npm run start
```

코드를 전달하기 전에 최소한 다음 명령을 통과시킨다.

```bash
npm run lint
npm run build
```

GitHub Actions도 Pull Request와 `main` push에서 `npm ci`, lint, build를 실행한다.

## Security Rules

- `.env.local`, `.env.*.local`, `*.pem` 파일을 커밋하지 않는다.
- 실제 EC2 주소, SSH 키 경로, 비밀번호, 토큰을 코드나 README에 넣지 않는다.
- 공유 가능한 환경변수 이름과 로컬 기본값만 `.env.example`에 기록한다.
- 백엔드 8080 포트를 외부에 공개하지 않는다. 로컬 개발에서는 SSH 터널을 사용한다.
- 인증 토큰의 브라우저 저장 방식을 임의로 정하지 않는다. 백엔드 인증 방식이 확정된 후 적용한다.

## Current Scope

현재 구현된 범위는 로그인·회원가입 화면, 인증 요청 폼, Next.js 인증 프록시 및 프론트엔드 CI다. 로그인 상태 유지, 사용자 조회, 로그아웃, 보호된 페이지와 로그인 후 이동 경로는 백엔드 인증 계약 확정 후 구현한다.
