# 환경 변수 설정 가이드

이 문서는 AI-Pass 서버의 환경 변수 설정 방법을 안내합니다.

## 📁 파일 구조

```
apps/server/
├── .env.example          # 환경 변수 템플릿 (Git에 커밋됨)
├── .env                  # 실제 환경 변수 파일 (Git에 커밋되지 않음)
└── src/config/
    ├── env.helpers.ts    # 환경 변수 파일 경로 해결
    ├── env.schema.ts     # 환경 변수 타입 정의
    └── env.config.ts     # 환경 변수 설정 팩토리
```

## 🚀 빠른 시작

### 1. 환경 변수 파일 생성

```bash
cd apps/server
cp .env.example .env
```

### 2. 환경 변수 값 입력

`.env` 파일을 열어서 각 환경 변수에 실제 값을 입력하세요.

```bash
# 에디터로 열기
code .env
# 또는
vim .env
```

## 📋 필수 환경 변수

다음 환경 변수들은 애플리케이션 시작 시 반드시 설정되어 있어야 합니다:

### 애플리케이션 환경
- `NODE_ENV`: `development` | `production` | `test`

### PostgreSQL 데이터베이스
- `DATABASE_HOST`: 데이터베이스 호스트 (기본값: `localhost`)
- `DATABASE_PORT`: 데이터베이스 포트 (기본값: `5432`)
- `DATABASE_NAME`: 데이터베이스 이름
- `DATABASE_USER`: 데이터베이스 사용자명
- `DATABASE_PASSWORD`: 데이터베이스 비밀번호

### MongoDB
- `MONGO_HOST`: MongoDB 호스트 (기본값: `localhost`)
- `MONGO_PORT`: MongoDB 포트 (기본값: `27017`)
- `MONGO_DATABASE`: MongoDB 데이터베이스 이름

### Google OAuth
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿
- `GOOGLE_CALLBACK_URL`: OAuth 콜백 URL

## 🔧 선택적 환경 변수

### 시드 데이터 (개발용)
- `SEED_ADMIN_EMAIL`: 관리자 이메일 (기본값: `admin@example.com`)
- `SEED_ADMIN_USERNAME`: 관리자 사용자명 (기본값: `admin`)

### 서버 포트
- `SERVER_PORT`: 서버 포트 (기본값: `5002`)

## 🔐 Google OAuth 설정 방법

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **API 및 서비스** > **사용자 인증 정보** 이동
4. **OAuth 2.0 클라이언트 ID 만들기** 클릭
5. 애플리케이션 유형: **웹 애플리케이션** 선택
6. **승인된 리디렉션 URI**에 다음 추가:
   - 개발: `http://localhost:5002/auth/google/callback`
   - 프로덕션: `https://your-domain.com/auth/google/callback`
7. 생성된 클라이언트 ID와 시크릿을 `.env` 파일에 입력

## 🌍 환경별 설정

### 개발 환경 (Development)

```env
NODE_ENV=development
DATABASE_HOST=localhost
MONGO_HOST=localhost
GOOGLE_CALLBACK_URL=http://localhost:5002/auth/google/callback
```

### 프로덕션 환경 (Production)

```env
NODE_ENV=production
DATABASE_HOST=your-production-db-host
MONGO_HOST=your-production-mongo-host
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
```

## 📝 환경 변수 파일 로드 우선순위

NestJS ConfigModule은 다음 순서로 환경 변수 파일을 로드합니다:

1. `apps/server/.env` (최우선)
2. `apps/server/.env.local`
3. `apps/server/.env.{NODE_ENV}`
4. `apps/server/.env.{NODE_ENV}.local`
5. 프로젝트 루트의 `.env` 파일들
6. `apps/server/env.local` (하위 호환성, deprecated)

**나중에 로드된 파일의 값이 이전 값을 덮어씁니다.**

## ⚠️ 주의사항

1. **`.env` 파일은 절대 Git에 커밋하지 마세요**
   - `.gitignore`에 이미 포함되어 있습니다
   - 민감한 정보(비밀번호, API 키 등)가 포함되어 있습니다

2. **`.env.example` 파일은 템플릿입니다**
   - 실제 값 없이 구조만 제공합니다
   - Git에 커밋되어 팀원들과 공유됩니다

3. **환경 변수 변경 후 서버 재시작 필요**
   - 환경 변수는 애플리케이션 시작 시 로드됩니다
   - 변경 사항을 적용하려면 서버를 재시작하세요

## 🐛 문제 해결

### 환경 변수를 찾을 수 없다는 에러가 발생하는 경우

1. `.env` 파일이 `apps/server/` 디렉토리에 있는지 확인
2. 파일 이름이 정확한지 확인 (`.env`, `.env.local` 등)
3. 환경 변수 이름이 정확한지 확인 (대소문자 구분)
4. 서버를 재시작했는지 확인

### Google OAuth 에러가 발생하는 경우

1. `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET`이 올바르게 설정되었는지 확인
2. Google Cloud Console에서 승인된 리디렉션 URI가 올바르게 설정되었는지 확인
3. 콜백 URL이 `GOOGLE_CALLBACK_URL`과 일치하는지 확인

