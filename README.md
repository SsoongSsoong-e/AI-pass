# AI-Pass v2

AI 기반 여권 사진 생성 및 검증 시스템

## 📋 목차

- [시작하기](#시작하기)
- [로컬 개발](#로컬-개발)
- [프로덕션 배포](#프로덕션-배포)
- [환경 변수 설정](#환경-변수-설정)
- [문서](#문서)

---

## 시작하기

### 전제 조건

- Node.js 18 이상
- PostgreSQL (로컬 또는 Docker)
- MongoDB (로컬 또는 Docker)
- AI 모델 서버 (로컬 실행)

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 편집
```

---

## 로컬 개발

### 개발 환경 실행 (`npm run dev`)

**동작 방식**:
- PostgreSQL과 MongoDB는 Docker 컨테이너로 자동 실행
- client와 server는 turbo로 로컬에서 함께 실행

```bash
# 1. 환경 변수 설정
cp .env.example .env.local
# .env.local 편집 (DATABASE_HOST=localhost)

# 2. 개발 환경 시작 (DB 컨테이너 자동 시작 + turbo dev)
npm run dev

# 3. 개발 환경 종료 (DB 컨테이너만 종료)
npm run dev:down
```

**특징**:
- ✅ DB는 Docker 컨테이너로 자동 관리
- ✅ client와 server는 로컬에서 실행 (빠른 개발 사이클, Hot Reload)
- ✅ 환경 변수는 `.env.local` 사용
- ✅ 개발 전용 볼륨 사용 (프로덕션과 분리)

---

## 프로덕션 배포

### 프로덕션 환경 실행 (`npm run prod`)

**동작 방식**:
- 모든 서비스를 Docker Compose로 실행
- client는 빌드 후 preview 모드로 실행
- server는 프로덕션 모드로 실행

```bash
# 1. 환경 변수 설정
export NODE_ENV=production
export DATABASE_PASSWORD=your_production_password
export GOOGLE_CLIENT_ID=your_production_client_id
export GOOGLE_CLIENT_SECRET=your_production_client_secret
export GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
# ... 기타 환경 변수

# 2. 프로덕션 빌드 및 시작
npm run prod:build

# 또는 이미 빌드된 경우
npm run prod

# 3. 로그 확인
npm run prod:logs

# 4. 프로덕션 환경 종료
npm run prod:down
```

**특징**:
- ✅ 모든 서비스가 Docker 컨테이너로 실행
- ✅ 프로덕션 환경 변수 사용
- ✅ 격리된 환경
- ✅ 프로덕션 전용 볼륨 사용

자세한 내용은 [배포 가이드](./docs/DEPLOYMENT.md)를 참고하세요.

---

## 환경 변수 설정

### 로컬 개발

**파일**: `.env.local` (프로젝트 루트)

```env
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
# ... 기타 설정
```

### 프로덕션

**방법 1: 환경 변수 직접 주입** (권장)

```bash
export DATABASE_PASSWORD=prod_password
export GOOGLE_CLIENT_ID=prod_client_id
docker-compose up -d
```

**방법 2: .env.production 파일**

1. `.env.production` 파일 생성
2. `docker-compose.yml`에서 `env_file` 주석 해제

자세한 내용은 [환경 변수 관리 가이드](./docs/ENV_VARIABLES.md)를 참고하세요.

---

## 문서

- [환경 변수, Docker, Auth 종합 보고서](./docs/COMPREHENSIVE_CONFIGURATION_REPORT.md) - 환경 변수, Docker, Auth 관련 전체 내용
- [환경 변수 관리 가이드](./docs/ENV_VARIABLES.md) - 환경 변수 설정 및 관리 방법
- [배포 가이드](./docs/DEPLOYMENT.md) - 로컬 개발 및 프로덕션 배포 방법
- [문제 해결 가이드](./TROUBLESHOOTING.md) - 발생한 문제들과 해결 방법

---

## 프로젝트 구조

```
AI-pass/
├── apps/
│   ├── server/          # NestJS 백엔드 서버
│   └── client/          # React 프론트엔드
├── packages/
│   ├── ui/              # 공유 UI 컴포넌트
│   └── typescript-config/  # TypeScript 설정
├── docs/                # 문서
├── .env.example         # 환경 변수 예시
├── .env.local           # 로컬 개발용 환경 변수 (Git 무시)
├── docker-compose.yml   # 프로덕션용 Docker Compose
└── docker-compose.dev.yml  # 개발용 Docker Compose (DB만)
```

---

## 주요 기능

- 📸 실시간 여권 사진 검증 (WebSocket)
- ✂️ AI 기반 얼굴 크롭 및 편집
- 🔐 Google OAuth 인증
- 📦 사진 저장 및 관리 (MongoDB)
- 🐳 Docker 지원

---

## 기술 스택

### Backend
- NestJS
- TypeORM (PostgreSQL)
- Mongoose (MongoDB)
- Passport.js (OAuth)

### Frontend
- React
- Vite
- Socket.io Client
- Styled Components

### Infrastructure
- Docker & Docker Compose
- PostgreSQL
- MongoDB

---

## 라이선스

Private
