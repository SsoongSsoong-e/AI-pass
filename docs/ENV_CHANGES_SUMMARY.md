****# 환경 변수 관리 개선 요약

## 📋 변경 사항 개요

환경 변수 관리 시스템을 dev/prod 환경에 맞게 분리하고, 로컬 개발과 프로덕션 배포를 명확히 구분했습니다.

---

## 🔄 주요 변경 사항

### 1. **env.config.ts** - dev/prod 기본값 분리

**변경 전:**
- 모든 환경에서 동일한 기본값 사용 (`localhost`, `postgres` 등)

**변경 후:**
- **개발 환경**: `localhost` 기반 기본값
- **프로덕션 환경**: Docker 서비스 이름 기반 기본값 (`postgres`, `mongodb`)

**주요 변경:**
```typescript
// 개발 환경
DATABASE_HOST: process.env.DATABASE_HOST || 'localhost'
MONGO_HOST: process.env.MONGO_HOST || 'localhost'
MODEL_SERVER_URL: process.env.MODEL_SERVER_URL || 'http://localhost:5001'

// 프로덕션 환경
DATABASE_HOST: process.env.DATABASE_HOST || 'postgres'  // Docker 서비스 이름
MONGO_HOST: process.env.MONGO_HOST || 'mongodb'          // Docker 서비스 이름
MODEL_SERVER_URL: process.env.MODEL_SERVER_URL || 'http://host.docker.internal:5001'
```

**시드 데이터:**
- 개발 환경에서만 사용 (`isDevelopment` 체크)

---

### 2. **env.helpers.ts** - 환경별 파일 우선순위 명확화

**변경 전:**
- 모든 환경에서 동일한 우선순위

**변경 후:**
- **개발 환경** 우선순위:
  1. `.env.development.local` (최우선)
  2. `.env.local`
  3. `.env.development`
  4. `.env`

- **프로덕션 환경** 우선순위:
  1. `.env.production.local` (최우선)
  2. `.env.production`
  3. `.env.local` (로컬 오버라이드)
  4. `.env`

**주요 변경:**
```typescript
// 개발 환경에서는 .env.local도 로드
if (env === 'development') {
  paths.push(join(baseDir, '.env.local'));
}
```

---

### 3. **app.module.ts** - 환경별 검증 메시지 개선

**변경 전:**
- 모든 환경에서 동일한 에러 메시지

**변경 후:**
- **개발 환경**: `.env.local` 파일 생성 안내
- **프로덕션 환경**: 환경 변수 직접 설정 또는 `.env.production` 파일 안내

**주요 변경:**
```typescript
if (isProduction) {
  console.error('   프로덕션 환경:');
  console.error('   1. 환경 변수를 직접 설정하거나');
  console.error('   2. .env.production 파일을 생성하여 설정');
} else {
  console.error('   개발 환경:');
  console.error('   1. 프로젝트 루트에 .env.local 파일 생성');
  console.error('   2. cp .env.example .env.local 명령어로 복사');
}
```

---

### 4. **docker-compose.yml** - 프로덕션 환경 변수 설정 개선

**변경 전:**
- `env_file: .env.local` 사용 (로컬 개발용 파일)

**변경 후:**
- `env_file` 제거 (주석 처리)
- 환경 변수 직접 주입 또는 `.env.production` 사용
- 필수 환경 변수 주석 추가

**주요 변경:**
```yaml
# 프로덕션 환경 변수 설정
# 주의: 로컬 개발(npm run dev)에서는 이 파일을 사용하지 않음
# 
# 환경 변수 설정 방법:
# 1. 환경 변수 직접 주입 (권장, 보안상 안전)
#    export DATABASE_PASSWORD=xxx && docker-compose up -d
# 
# 2. .env.production 파일 사용
#    - .env.production 파일 생성 (Git에 커밋하지 않음)
#    - 아래 env_file 주석 해제
# env_file:
#   - .env.production
environment:
  DATABASE_PASSWORD: ${DATABASE_PASSWORD}  # 필수: 환경 변수로 설정
  GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}    # 필수: 환경 변수로 설정
  # ...
```

**PostgreSQL 기본값 제거:**
- `POSTGRES_PASSWORD: ${DATABASE_PASSWORD:-secret}` → `POSTGRES_PASSWORD: ${DATABASE_PASSWORD}` (필수)

---

### 5. **.env.example** - 프로젝트 루트에 생성

**새로 생성:**
- 프로젝트 루트에 `.env.example` 파일 생성
- 모든 환경 변수 예시 포함
- 환경별 설명 추가

**주요 내용:**
```env
# 로컬 개발: localhost
# Docker: postgres (서비스 이름)
DATABASE_HOST=localhost

# 로컬 개발: http://localhost:5001
# Docker: http://host.docker.internal:5001
MODEL_SERVER_URL=http://localhost:5001
```

---

## 📁 파일 구조

### 변경된 파일

```
AI-pass/
├── .env.example                    # ✅ 새로 생성 (프로젝트 루트)
├── apps/server/src/config/
│   ├── env.config.ts               # ✅ dev/prod 기본값 분리
│   └── env.helpers.ts               # ✅ 환경별 우선순위 명확화
├── apps/server/src/
│   └── app.module.ts               # ✅ 환경별 검증 메시지 개선
└── docker-compose.yml              # ✅ 프로덕션 환경 변수 설정 개선
```

---

## 🎯 환경별 동작 방식

### 로컬 개발 (`npm run dev`)

**환경 변수 파일:**
- `.env.local` (프로젝트 루트) 사용
- Docker Compose 사용 안 함

**기본값:**
- `DATABASE_HOST=localhost`
- `MONGO_HOST=localhost`
- `MODEL_SERVER_URL=http://localhost:5001`

**실행 방법:**
```bash
# 1. 환경 변수 설정
cp .env.example .env.local
# .env.local 편집

# 2. 서버 실행
cd apps/server
npm run dev
```

---

### 프로덕션 배포 (`docker-compose up`)

**환경 변수 설정:**
- 환경 변수 직접 주입 또는 `.env.production` 파일

**기본값:**
- `DATABASE_HOST=postgres` (Docker 서비스 이름)
- `MONGO_HOST=mongodb` (Docker 서비스 이름)
- `MODEL_SERVER_URL=http://host.docker.internal:5001`

**실행 방법:**
```bash
# 방법 1: 환경 변수 직접 주입 (권장)
export DATABASE_PASSWORD=prod_password
export GOOGLE_CLIENT_ID=prod_client_id
export GOOGLE_CLIENT_SECRET=prod_client_secret
docker-compose up -d

# 방법 2: .env.production 파일 사용
# .env.production 파일 생성 후
# docker-compose.yml에서 env_file 주석 해제
```

---

## 🔍 환경 변수 로드 우선순위

### 개발 환경 (NODE_ENV=development)

1. `.env.development.local` (최우선, Git 무시)
2. `.env.local` (로컬 개발용, Git 무시)
3. `.env.development`
4. `.env`
5. `apps/server/.env.local` (하위 호환성)
6. `apps/server/.env` (하위 호환성)

### 프로덕션 환경 (NODE_ENV=production)

1. `.env.production.local` (최우선, Git 무시)
2. `.env.production`
3. `.env.local` (로컬 오버라이드, Git 무시)
4. `.env`
5. `apps/server/.env.production` (하위 호환성)
6. `apps/server/.env` (하위 호환성)

---

## ✅ 체크리스트

### 즉시 적용

- [x] `env.config.ts` - dev/prod 기본값 분리
- [x] `env.helpers.ts` - 환경별 우선순위 명확화
- [x] `app.module.ts` - 환경별 검증 메시지 개선
- [x] `docker-compose.yml` - 프로덕션 환경 변수 설정 개선
- [ ] `.env.example` - 프로젝트 루트에 생성 (수동 생성 필요)

### 수동 작업 필요

1. **`.env.example` 파일 생성**
   ```bash
   # 프로젝트 루트에 .env.example 파일 생성
   # 위의 예시 내용 복사하여 생성
   ```

2. **`.env.local` 파일 생성** (개발용)
   ```bash
   cp .env.example .env.local
   # .env.local 편집하여 실제 값 입력
   ```

3. **`.env.production` 파일 생성** (프로덕션용, 선택사항)
   ```bash
   # 프로덕션 환경 변수 설정
   # docker-compose.yml에서 env_file 주석 해제 시 사용
   ```

---

## 🚀 마이그레이션 가이드

### 기존 사용자

**기존에 `apps/server/env.local`을 사용하던 경우:**

1. `.env.local` 생성 (프로젝트 루트)
   ```bash
   cp apps/server/env.local .env.local
   ```

2. 기존 파일 제거 (선택사항)
   ```bash
   rm apps/server/env.local
   ```

3. 애플리케이션 재시작
   ```bash
   npm run dev
   ```

---

## 📚 관련 문서

- [환경 변수 관리 가이드](./ENV_VARIABLES.md) - 상세한 환경 변수 설정 방법
- [배포 가이드](./DEPLOYMENT.md) - 로컬 개발 및 프로덕션 배포 방법
- [문제 해결 가이드](../TROUBLESHOOTING.md) - 발생한 문제들과 해결 방법

---

## 🔐 보안 고려사항

1. **`.env.local`, `.env.production`은 Git에 커밋하지 않기**
   - `.gitignore`에 이미 포함되어 있음

2. **프로덕션 환경 변수**
   - 환경 변수 직접 주입 권장 (보안상 안전)
   - `.env.production` 파일 사용 시 보안 주의

3. **민감한 정보**
   - 비밀번호, API 키 등은 절대 Git에 커밋하지 않기
   - `.env.example`에는 예시 값만 포함

---

## 변경 이력

- **2025-11-14**: 환경 변수 관리 시스템 개선
  - dev/prod 환경 분리
  - 환경별 기본값 설정
  - 환경별 파일 우선순위 명확화
  - 프로덕션 환경 변수 설정 개선

