# 환경 변수 관리 가이드

## 📋 목차

1. [개요](#개요)
2. [파일 구조](#파일-구조)
3. [로드 우선순위](#로드-우선순위)
4. [설정 방법](#설정-방법)
5. [환경별 설정](#환경별-설정)
6. [Docker 환경](#docker-환경)
7. [문제 해결](#문제-해결)

---

## 개요

이 프로젝트는 **중앙화된 환경 변수 관리 시스템**을 사용합니다. 모든 환경 변수는 프로젝트 루트의 `.env` 파일들을 통해 관리되며, NestJS의 `ConfigModule`을 통해 로드됩니다.

### 주요 원칙

- ✅ **단일 소스**: 모든 환경 변수는 프로젝트 루트의 `.env` 파일에서 관리
- ✅ **명확한 우선순위**: 환경별 파일 우선순위가 명확히 정의됨
- ✅ **타입 안전성**: TypeScript와 Zod를 통한 환경 변수 검증
- ✅ **보안**: 민감한 정보는 Git에 커밋되지 않음

---

## 파일 구조

```
AI-pass/
├── .env.example          # 📝 모든 환경 변수 예시 (Git 커밋)
├── .env.local            # 🔒 실제 개발용 환경 변수 (Git 무시)
├── .env.development      # 개발 환경 설정 (선택사항)
├── .env.production       # 프로덕션 환경 설정 (선택사항)
└── apps/
    └── server/
        └── .env.example  # 서버 전용 예시 (선택사항)
```

### 파일 설명

| 파일 | 용도 | Git 커밋 | 우선순위 |
|------|------|----------|----------|
| `.env.example` | 환경 변수 예시 템플릿 | ✅ 예 | - |
| `.env.local` | 로컬 개발용 실제 값 | ❌ 아니오 | 높음 |
| `.env.development` | 개발 환경 공통 설정 | 선택 | 중간 |
| `.env.production` | 프로덕션 환경 설정 | 선택 | 중간 |
| `.env` | 기본 설정 | ❌ 아니오 | 낮음 |

---

## 로드 우선순위

환경 변수는 다음 순서로 로드됩니다 (위에서 아래로, 나중에 로드된 값이 우선):

### 1. 프로젝트 루트 파일 (최우선)

```
1. .env.{NODE_ENV}.local    # 예: .env.development.local
2. .env.local                # 로컬 개발용
3. .env.{NODE_ENV}           # 예: .env.development
4. .env                      # 기본 설정
```

### 2. apps/server 디렉토리 파일 (하위 호환성)

```
5. apps/server/.env.local
6. apps/server/.env
7. apps/server/.env.{NODE_ENV}
8. apps/server/.env.{NODE_ENV}.local
```

### 3. 구버전 파일 (deprecated)

```
9. apps/server/env.local     # 제거 예정
```

**중요**: 나중에 로드된 파일의 값이 이전 값을 덮어씁니다.

---

## 설정 방법

### 1. 초기 설정

```bash
# 1. 프로젝트 루트로 이동
cd /Users/namu/workspace/ai-pass-v2/AI-pass

# 2. .env.example을 .env.local로 복사
cp .env.example .env.local

# 3. .env.local 파일을 열어 실제 값 입력
# (Git에 커밋되지 않으므로 안전하게 실제 값 입력 가능)
```

### 2. 환경 변수 수정

`.env.local` 파일을 직접 수정하면 됩니다:

```env
# .env.local
DATABASE_PASSWORD=my_actual_password
GOOGLE_CLIENT_ID=my_actual_client_id
```

### 3. 환경 변수 확인

애플리케이션 시작 시 환경 변수 검증이 자동으로 수행됩니다:

```bash
npm run dev
```

검증 실패 시:
```
❌ 필수 환경 변수가 설정되지 않았습니다:
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
```

---

## 환경별 설정

### 개발 환경 (Development)

**파일**: `.env.local` 또는 `.env.development`

```env
NODE_ENV=development
DATABASE_HOST=localhost
MODEL_SERVER_URL=http://localhost:5001
```

### 프로덕션 환경 (Production)

**파일**: `.env.production` 또는 환경 변수 직접 설정

```env
NODE_ENV=production
DATABASE_HOST=production-db-host
MODEL_SERVER_URL=https://model-server.example.com
```

**보안 주의**: 프로덕션 환경에서는 환경 변수를 직접 설정하거나 시크릿 관리 시스템을 사용하는 것을 권장합니다.

---

## Docker 환경

### Docker Compose 설정

`docker-compose.yml`에서 환경 변수를 다음과 같이 관리합니다:

```yaml
services:
  server:
    # 1. 환경 변수 파일 로드 (로컬 개발용)
    env_file:
      - .env.local
    
    # 2. Docker 컨테이너 전용 설정 (env_file보다 우선)
    environment:
      DATABASE_HOST: postgres      # Docker 서비스 이름
      MONGO_HOST: mongodb           # Docker 서비스 이름
      MODEL_SERVER_URL: ${MODEL_SERVER_URL:-http://host.docker.internal:5001}
```

### 우선순위 (Docker)

1. `environment` 섹션의 직접 정의 (최우선)
2. `env_file`로 로드된 값
3. `docker-compose.yml`의 `${VAR:-default}` 기본값

### Docker에서 호스트 접근

Docker 컨테이너에서 호스트 머신의 서비스에 접근할 때:

- **Mac/Windows**: `host.docker.internal` 사용
- **Linux**: `172.17.0.1` 또는 `host.docker.internal` (Docker 20.10+)

```env
# .env.local
MODEL_SERVER_URL=http://host.docker.internal:5001
```

---

## 환경 변수 목록

### 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NODE_ENV` | 실행 환경 | `development`, `production`, `test` |
| `DATABASE_HOST` | PostgreSQL 호스트 | `localhost` 또는 `postgres` (Docker) |
| `DATABASE_PORT` | PostgreSQL 포트 | `5432` |
| `DATABASE_NAME` | 데이터베이스 이름 | `ai_pass` |
| `DATABASE_USER` | 데이터베이스 사용자 | `ai_pass` |
| `DATABASE_PASSWORD` | 데이터베이스 비밀번호 | `secret` |
| `MONGO_HOST` | MongoDB 호스트 | `localhost` 또는 `mongodb` (Docker) |
| `MONGO_PORT` | MongoDB 포트 | `27017` |
| `MONGO_DATABASE` | MongoDB 데이터베이스 | `ai-pass` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | Google OAuth 콜백 URL | `http://localhost:5002/auth/google/callback` |

### 선택적 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `MODEL_SERVER_URL` | AI 모델 서버 URL | `http://host.docker.internal:5001` |
| `SEED_ADMIN_EMAIL` | 관리자 이메일 (시드 데이터) | - |
| `SEED_ADMIN_USERNAME` | 관리자 사용자명 (시드 데이터) | - |
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 (S3, 향후 구현) | - |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 키 (S3, 향후 구현) | - |
| `AWS_REGION` | AWS 리전 (S3, 향후 구현) | - |
| `AWS_S3_BUCKET` | S3 버킷 이름 (향후 구현) | - |

---

## 문제 해결

### 1. 환경 변수를 찾을 수 없음

**증상**:
```
❌ 필수 환경 변수가 설정되지 않았습니다: GOOGLE_CLIENT_ID
```

**해결 방법**:
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. `.env.local` 파일에 해당 환경 변수가 있는지 확인
3. 환경 변수 이름이 정확한지 확인 (대소문자 구분)

### 2. Docker에서 환경 변수가 로드되지 않음

**증상**: Docker 컨테이너 내부에서 환경 변수가 `undefined`

**해결 방법**:
1. `docker-compose.yml`의 `env_file` 섹션 확인
2. `.env.local` 파일이 프로젝트 루트에 있는지 확인
3. Docker 컨테이너 재시작:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### 3. 환경 변수 우선순위 문제

**증상**: 예상과 다른 값이 사용됨

**해결 방법**:
1. 로드 우선순위 확인 (위의 [로드 우선순위](#로드-우선순위) 섹션 참고)
2. 여러 파일에 같은 변수가 있는지 확인
3. 나중에 로드된 파일의 값이 우선됨

### 4. TypeORM 마이그레이션에서 환경 변수 로드 실패

**증상**: 마이그레이션 실행 시 데이터베이스 연결 실패

**해결 방법**:
- `data-source.ts`가 `env.helpers.ts`의 경로를 사용하도록 수정됨
- `ConfigModule`과 동일한 우선순위로 환경 변수 로드

---

## 마이그레이션 가이드

### 기존 파일에서 마이그레이션

기존에 `apps/server/env.local`을 사용하던 경우:

1. **`.env.local` 생성** (프로젝트 루트)
   ```bash
   cp apps/server/env.local .env.local
   ```

2. **기존 파일 제거** (선택사항)
   ```bash
   rm apps/server/env.local
   ```

3. **애플리케이션 재시작**
   ```bash
   npm run dev
   ```

### Docker 환경 마이그레이션

기존에 `docker/server.env`를 사용하던 경우:

1. **`.env.local` 사용** (권장)
   - `docker-compose.yml`의 `env_file` 섹션에 `.env.local` 추가됨

2. **또는 `docker/.env.docker` 사용** (선택사항)
   ```yaml
   env_file:
     - .env.local
     - docker/.env.docker
   ```

---

## 보안 체크리스트

- [ ] `.env.local`이 `.gitignore`에 포함되어 있는지 확인
- [ ] `.env.example`에는 예시 값만 포함 (실제 비밀번호 없음)
- [ ] 프로덕션 환경에서는 환경 변수를 직접 설정하거나 시크릿 관리 시스템 사용
- [ ] 민감한 정보(비밀번호, API 키)는 절대 Git에 커밋하지 않기

---

## 추가 리소스

- [NestJS ConfigModule 문서](https://docs.nestjs.com/techniques/configuration)
- [dotenv 문서](https://github.com/motdotla/dotenv)
- [프로젝트 ENV_SETUP.md](../apps/server/ENV_SETUP.md)

---

## 변경 이력

- **2025-11-14**: 환경 변수 관리 시스템 중앙화
  - 프로젝트 루트에 `.env.example`, `.env.local` 생성
  - `env.helpers.ts` 우선순위 개선
  - `data-source.ts`에서 중복 로드 제거
  - `docker-compose.yml`에 `env_file` 추가

