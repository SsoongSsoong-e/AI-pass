# 환경 변수, Docker, Auth 종합 설정 보고서

## 📋 목차

1. [문제 분석 및 해결 과정](#문제-분석-및-해결-과정)
2. [개요](#개요)
3. [실행 방법](#실행-방법)
4. [환경 변수 관리 시스템](#환경-변수-관리-시스템)
5. [Docker 환경 설정](#docker-환경-설정)
6. [팩토리 디자인 패턴 적용](#팩토리-디자인-패턴-적용)
7. [Google OAuth 인증 시스템](#google-oauth-인증-시스템)
8. [아키텍처 다이어그램](#아키텍처-다이어그램)
9. [문제 해결](#문제-해결)

---

## 문제 분석 및 해결 과정

### 1. 문제 상황

#### 1.1 환경 변수 관리 문제

**문제점**:
- 환경 변수 파일이 여러 곳에 분산되어 있음 (`apps/server/env.local`, `docker/server.env`, `docker-compose.yml` 등)
- 로드 우선순위가 불명확하여 어떤 파일이 적용되는지 알기 어려움
- 개발 환경과 프로덕션 환경 구분이 명확하지 않음
- TypeORM DataSource와 NestJS ConfigModule에서 중복으로 환경 변수 로드

**영향**:
- 환경 변수 설정 시 혼란 발생
- 환경 변수 누락 시 런타임 에러 발생
- 개발/프로덕션 환경 전환 시 문제 발생 가능

#### 1.2 Docker 환경 분리 문제

**문제점**:
- 개발 환경과 프로덕션 환경이 같은 Docker 프로젝트 이름을 사용하여 컨테이너가 교체됨
- 개발 환경과 프로덕션 환경이 같은 Docker 네트워크를 사용할 수 있음
- 볼륨 이름이 충돌할 가능성
- `docker-compose.yml`에서 `NODE_ENV` 기본값이 `production`이지만 명시적이지 않음
- `POSTGRES_PASSWORD` 환경 변수가 없을 때 빈 값으로 설정되어 PostgreSQL 초기화 실패
- 개발 환경과 프로덕션 환경이 완전히 분리되지 않음

**영향**:
- `npm run dev` 실행 시 프로덕션 컨테이너가 삭제되고 개발 컨테이너로 교체됨
- 개발 환경 컨테이너와 프로덕션 환경 컨테이너가 충돌할 수 있음
- 데이터베이스 볼륨이 섞일 위험
- 네트워크 충돌 가능성
- 프로덕션 환경 시작 시 PostgreSQL 초기화 실패

#### 1.3 실행 방법 불명확

**문제점**:
- `npm run dev`와 프로덕션 배포 방법이 명확하지 않음
- 개발 환경에서 DB만 Docker로 실행하는 방법이 불명확
- 프로덕션 환경에서 모든 서비스를 Docker로 실행하는 방법이 불명확

**영향**:
- 개발자마다 다른 방식으로 실행하여 환경 불일치 발생
- 온보딩 시 혼란 발생

#### 1.4 프로덕션 빌드 문제

**문제점**:
- Dockerfile이 개발 모드(`npm run dev`)로 설정되어 빌드 없이 실행
- `docker-compose.yml`에서 볼륨 마운트로 소스 코드를 덮어써서 빌드 결과물이 없음
- Client 빌드 실패: `tsc -b && vite build` 명령 실패
- Server 실행 실패: `Cannot find module '/usr/src/app/apps/server/dist/src/main'` - 빌드된 파일이 없음

**영향**:
- 프로덕션 환경에서 애플리케이션이 실행되지 않음
- 빌드 과정이 없어서 TypeScript 컴파일 및 번들링이 수행되지 않음
- 컨테이너 시작 시 즉시 실패

---

### 2. 해결 방법 고안

#### 2.1 환경 변수 관리 중앙화

**해결 방안**:
1. **표준화된 파일 구조**
   - 프로젝트 루트에 `.env.example`, `.env.local` 생성
   - 환경별 파일 우선순위 명확화

2. **통합된 로드 방식**
   - 모든 환경 변수 로드를 `ConfigModule`에 통합
   - `env.helpers.ts`에서 경로 해결 로직 통합
   - TypeORM DataSource도 동일한 경로 사용

3. **팩토리 패턴 적용**
   - `env.config.ts`에서 환경별 기본값 동적 생성
   - dev/prod 환경에 따라 다른 기본값 적용

#### 2.2 Docker 환경 완전 분리

**해결 방안**:
1. **프로젝트 이름 분리**
   - 개발 환경: `-p ai-pass-dev` 옵션 사용
   - 프로덕션 환경: `-p ai-pass-prod` 옵션 사용
   - Docker Compose가 완전히 별도의 프로젝트로 인식

2. **네트워크 분리**
   - 개발 환경: `ai-pass-dev-network`
   - 프로덕션 환경: `ai-pass-prod-network`

3. **볼륨 이름 명시**
   - 개발 환경: `ai-pass-postgres-dev`, `ai-pass-mongodb-dev`
   - 프로덕션 환경: `ai-pass-postgres-prod`, `ai-pass-mongodb-prod`

4. **컨테이너명 분리**
   - 개발 환경: `-dev` 접미사
   - 프로덕션 환경: 접미사 없음

5. **환경 변수 명시 및 기본값 제공**
   - `docker-compose.yml`에서 `NODE_ENV: production` 명시
   - `POSTGRES_PASSWORD`에 기본값 제공 (`prod_password`)
   - `docker-compose.dev.yml`는 개발 환경 전용

#### 2.3 실행 방법 표준화

**해결 방안**:
1. **package.json 스크립트 추가**
   - `npm run dev`: DB 컨테이너 시작 + turbo dev
   - `npm run prod`: 모든 서비스 컨테이너 시작
   - `npm run dev:down`, `npm run prod:down`: 환경별 종료

2. **문서화**
   - README에 실행 방법 명시
   - 종합 보고서 작성

#### 2.4 프로덕션 빌드 시스템 구축

**해결 방안**:
1. **Dockerfile 프로덕션 모드 전환**
   - Server Dockerfile: 빌드 단계 추가 (`RUN npm run build`)
   - Client Dockerfile: 빌드 단계 추가 (`RUN npm run build`)
   - CMD를 프로덕션 모드로 변경 (`npm run start`, `npm run preview`)

2. **볼륨 마운트 제거**
   - 프로덕션 환경에서는 빌드된 파일을 사용하므로 소스 코드 마운트 불필요
   - `docker-compose.yml`에서 볼륨 마운트 제거

3. **Monorepo 의존성 처리**
   - `packages` 디렉토리 복사 추가
   - 루트 레벨에서 `npm install` 실행

---

### 3. 해결 과정

#### 3.1 환경 변수 관리 시스템 구축

**1단계: 파일 구조 표준화**
- 프로젝트 루트에 `.env.example` 생성 (모든 환경 변수 예시)
- `.env.local` 생성 (로컬 개발용, Git 무시)
- 기존 `apps/server/env.local`은 하위 호환성 유지

**2단계: 로드 우선순위 명확화**
- `env.helpers.ts` 수정: 환경별 파일 우선순위 명확화
  - 개발: `.env.development.local` → `.env.local` → `.env.development` → `.env`
  - 프로덕션: `.env.production.local` → `.env.production` → `.env.local` → `.env`

**3단계: 통합 로드 방식**
- `data-source.ts` 수정: `env.helpers.ts`의 경로 사용
- ConfigModule과 동일한 우선순위로 환경 변수 로드

**4단계: 팩토리 패턴 적용**
- `env.config.ts` 수정: 환경별 기본값 분리
  - 개발: `localhost` 기반
  - 프로덕션: Docker 서비스 이름 기반 (`postgres`, `mongodb`)

#### 3.2 Docker 환경 완전 분리

**1단계: 네트워크 분리**
```yaml
# docker-compose.dev.yml
networks:
  ai-pass-dev:
    name: ai-pass-dev-network

# docker-compose.yml
networks:
  ai-pass-prod:
    name: ai-pass-prod-network
```

**2단계: 볼륨 이름 명시**
```yaml
# docker-compose.dev.yml
volumes:
  postgres_data_dev:
    name: ai-pass-postgres-dev

# docker-compose.yml
volumes:
  postgres_data:
    name: ai-pass-postgres-prod
```

**3단계: 환경 변수 명시**
```yaml
# docker-compose.yml
environment:
  NODE_ENV: production  # 명시적으로 production 설정
```

**4단계: 서비스별 네트워크 지정**
- 모든 서비스에 `networks` 섹션 추가
- 개발 환경과 프로덕션 환경 네트워크 완전 분리

**5단계: 프로젝트 이름 분리**
- `package.json` 스크립트에 `-p` 옵션 추가
- 개발 환경: `-p ai-pass-dev`
- 프로덕션 환경: `-p ai-pass-prod`

**6단계: POSTGRES_PASSWORD 기본값 추가**
- `docker-compose.yml`에서 `POSTGRES_PASSWORD: ${DATABASE_PASSWORD:-prod_password}` 설정
- 프로덕션 환경에서도 테스트 가능하도록 기본값 제공

#### 3.4 프로덕션 빌드 시스템 구축

**1단계: Server Dockerfile 수정**
```dockerfile
# 빌드 단계 추가
RUN npm run build

# 프로덕션 모드로 실행
CMD ["npm", "run", "start"]
```

**2단계: Client Dockerfile 수정**
```dockerfile
# 빌드 단계 추가
RUN npm run build

# 프로덕션 모드로 실행
CMD ["npm", "run", "preview"]
```

**3단계: docker-compose.yml 수정**
- 볼륨 마운트 제거 (프로덕션에서는 빌드된 파일 사용)
- command 제거 (Dockerfile의 CMD 사용)

**4단계: Monorepo 의존성 처리**
- `packages` 디렉토리 복사 추가
- 루트 레벨에서 `npm install` 실행

#### 3.5 실행 방법 표준화

**1단계: package.json 스크립트 추가 (프로젝트 이름 분리)**
```json
{
  "dev": "docker-compose -p ai-pass-dev -f docker-compose.dev.yml up -d postgres mongodb && turbo dev",
  "dev:down": "docker-compose -p ai-pass-dev -f docker-compose.dev.yml down",
  "prod": "docker-compose -p ai-pass-prod up -d",
  "prod:down": "docker-compose -p ai-pass-prod down",
  "prod:build": "npm run build && docker-compose -p ai-pass-prod up -d --build",
  "prod:logs": "docker-compose -p ai-pass-prod logs -f"
}
```

**2단계: 문서화**
- README 업데이트
- 종합 보고서 작성

---

### 4. 해결 결과

#### 4.1 환경 변수 관리

**개선 전**:
- 파일 분산: `apps/server/env.local`, `docker/server.env` 등
- 우선순위 불명확
- 중복 로드

**개선 후**:
- ✅ 중앙화된 관리: 프로젝트 루트의 `.env` 파일들
- ✅ 명확한 우선순위: 환경별 파일 우선순위 문서화
- ✅ 통합 로드: ConfigModule만 사용
- ✅ 팩토리 패턴: 환경별 기본값 자동 적용

#### 4.2 Docker 환경 분리

**개선 전**:
- 같은 프로젝트 이름 사용으로 컨테이너 교체 발생
- 네트워크 분리 없음
- 볼륨 이름 충돌 가능성
- 환경 구분 불명확
- `POSTGRES_PASSWORD` 미설정 시 초기화 실패

**개선 후**:
- ✅ 프로젝트 이름 완전 분리: `ai-pass-dev`, `ai-pass-prod` (독립 실행 가능)
- ✅ 네트워크 완전 분리: `ai-pass-dev-network`, `ai-pass-prod-network`
- ✅ 볼륨 이름 명시: `ai-pass-postgres-dev`, `ai-pass-postgres-prod`
- ✅ 환경 변수 명시: `NODE_ENV: production` 명시
- ✅ 컨테이너명 분리: `-dev` 접미사로 구분
- ✅ `POSTGRES_PASSWORD` 기본값 제공: 테스트 환경에서도 동작

#### 4.3 실행 방법

**개선 전**:
- 실행 방법 불명확
- 개발자마다 다른 방식 사용

**개선 후**:
- ✅ 표준화된 스크립트: `npm run dev`, `npm run prod`
- ✅ 자동화: DB 컨테이너 자동 시작
- ✅ 명확한 문서: README 및 종합 보고서

#### 4.4 프로덕션 빌드 시스템

**개선 전**:
- Dockerfile이 개발 모드로 설정
- 빌드 과정 없음
- 볼륨 마운트로 빌드 결과물 덮어쓰기
- 프로덕션 환경에서 실행 실패

**개선 후**:
- ✅ Dockerfile에 빌드 단계 추가: 빌드된 파일 생성
- ✅ 프로덕션 모드로 실행: `npm run start`, `npm run preview`
- ✅ 볼륨 마운트 제거: 빌드된 파일 사용
- ✅ Monorepo 의존성 처리: packages 디렉토리 포함

---

### 5. 검증

#### 5.1 개발 환경 검증

```bash
# 개발 환경 시작
npm run dev

# 확인 사항:
# 1. DB 컨테이너만 실행됨 (postgres-dev, mongodb-dev)
# 2. client와 server는 로컬에서 실행됨
# 3. 네트워크: ai-pass-dev-network
# 4. 볼륨: ai-pass-postgres-dev, ai-pass-mongodb-dev
```

#### 5.2 프로덕션 환경 검증

```bash
# 프로덕션 환경 시작
npm run prod

# 확인 사항:
# 1. 모든 서비스 컨테이너 실행됨 (postgres, mongodb, server, client)
# 2. 네트워크: ai-pass-prod-network
# 3. 볼륨: ai-pass-postgres-prod, ai-pass-mongodb-prod
# 4. NODE_ENV=production 설정됨
```

#### 5.3 환경 분리 검증

```bash
# 개발 환경과 프로덕션 환경이 동시에 실행 가능한지 확인
npm run dev    # 개발 환경 시작 (프로젝트: ai-pass-dev)
npm run prod   # 프로덕션 환경 시작 (프로젝트: ai-pass-prod)

# 확인 사항:
# 1. 두 환경이 동시에 실행됨
# 2. 별도 프로젝트로 관리됨 (docker ps로 확인)
# 3. 별도 네트워크 사용 (ai-pass-dev-network, ai-pass-prod-network)
# 4. 별도 볼륨 사용 (ai-pass-postgres-dev, ai-pass-postgres-prod)
# 5. 두 환경이 충돌하지 않고 독립적으로 실행됨
```

#### 5.4 프로젝트 이름 확인

```bash
# 개발 환경 프로젝트 확인
docker-compose -p ai-pass-dev -f docker-compose.dev.yml ps

# 프로덕션 환경 프로젝트 확인
docker-compose -p ai-pass-prod ps

# 두 프로젝트가 독립적으로 관리됨을 확인
```

---

## 개요

### 프로젝트 정보
- **프로젝트명**: AI-Pass v2
- **목적**: AI 기반 여권 사진 생성 및 검증 시스템
- **기술 스택**: 
  - Backend: NestJS, TypeORM (PostgreSQL), Mongoose (MongoDB)
  - Frontend: React, Vite
  - 인증: Google OAuth 2.0 (Passport.js)
  - 컨테이너화: Docker, Docker Compose

### 환경 구분
- **개발 환경** (`npm run dev`): DB만 Docker, client/server는 로컬 실행
- **프로덕션 환경** (`npm run prod`): 모든 서비스를 Docker 컨테이너로 실행

---

## 실행 방법

### 개발 환경 (`npm run dev`)

**동작 방식**:
1. Docker Compose로 PostgreSQL과 MongoDB만 컨테이너로 실행
2. Turbo로 client와 server를 로컬에서 함께 실행

**실행 명령어**:
```bash
# 개발 환경 시작
npm run dev

# 개발 환경 종료 (DB 컨테이너만 종료)
npm run dev:down
```

**실행 흐름**:
```
1. docker-compose -p ai-pass-dev -f docker-compose.dev.yml up -d postgres mongodb
   → PostgreSQL, MongoDB 컨테이너 시작 (프로젝트: ai-pass-dev)
   
2. turbo dev
   → client와 server를 로컬에서 함께 실행
   → client: http://localhost:5173
   → server: http://localhost:5002
```

**특징**:
- ✅ DB는 Docker 컨테이너로 관리 (환경 일관성)
- ✅ client/server는 로컬 실행 (빠른 개발 사이클, Hot Reload)
- ✅ 환경 변수는 `.env.local` 사용
- ✅ 개발 전용 볼륨 사용 (`postgres_data_dev`, `mongodb_data_dev`)

### 프로덕션 환경 (`npm run prod`)

**동작 방식**:
1. 모든 서비스를 Docker Compose로 실행
2. client는 빌드 후 preview 모드로 실행
3. server는 프로덕션 모드로 실행

**실행 명령어**:
```bash
# 프로덕션 환경 시작 (빌드 필요 시)
npm run prod:build

# 프로덕션 환경 시작 (이미 빌드된 경우)
npm run prod

# 프로덕션 환경 종료
npm run prod:down

# 프로덕션 로그 확인
npm run prod:logs
```

**실행 흐름**:
```
1. docker-compose -p ai-pass-prod up -d
   → postgres, mongodb, server, client 컨테이너 모두 시작 (프로젝트: ai-pass-prod)
   → 모든 서비스가 Docker 네트워크 내부에서 통신
```

**특징**:
- ✅ 모든 서비스가 Docker 컨테이너로 실행
- ✅ 격리된 환경에서 실행
- ✅ 환경 변수는 직접 주입 또는 `.env.production` 사용
- ✅ 프로덕션 전용 볼륨 사용 (`postgres_data`, `mongodb_data`)

### 스크립트 목록

| 스크립트 | 설명 | 실행 내용 |
|---------|------|----------|
| `npm run dev` | 개발 환경 시작 | DB 컨테이너 시작 (프로젝트: ai-pass-dev) + turbo dev |
| `npm run dev:down` | 개발 환경 종료 | DB 컨테이너 종료 (프로젝트: ai-pass-dev) |
| `npm run prod` | 프로덕션 환경 시작 | 모든 서비스 컨테이너 시작 (프로젝트: ai-pass-prod) |
| `npm run prod:down` | 프로덕션 환경 종료 | 모든 컨테이너 종료 (프로젝트: ai-pass-prod) |
| `npm run prod:build` | 프로덕션 빌드 및 시작 | 빌드 + 컨테이너 시작 (프로젝트: ai-pass-prod) |
| `npm run prod:logs` | 프로덕션 로그 확인 | docker-compose logs -f (프로젝트: ai-pass-prod) |

---

## 환경 변수 관리 시스템

### 1. 파일 구조

```
AI-pass/
├── .env.example              # 📝 모든 환경 변수 예시 (Git 커밋)
├── .env.local                # 🔒 로컬 개발용 (Git 무시)
├── .env.development          # 개발 환경 공통 설정 (선택사항)
├── .env.production           # 프로덕션 환경 설정 (선택사항, Git 무시)
├── apps/server/
│   └── src/config/
│       ├── env.schema.ts     # 환경 변수 스키마 정의
│       ├── env.config.ts     # 팩토리 함수 (설정 생성)
│       └── env.helpers.ts   # 환경 변수 파일 경로 해결
└── docker-compose.yml        # 프로덕션용 Docker Compose
└── docker-compose.dev.yml    # 개발용 Docker Compose (DB만)
```

### 2. 환경 변수 로드 우선순위

#### 개발 환경 (NODE_ENV=development)

```
우선순위 (위에서 아래로, 나중에 로드된 값이 우선):
1. .env.development.local    (최우선, Git 무시)
2. .env.local                (로컬 개발용, Git 무시)
3. .env.development
4. .env
5. apps/server/.env.local     (하위 호환성)
6. apps/server/.env           (하위 호환성)
```

#### 프로덕션 환경 (NODE_ENV=production)

```
우선순위 (위에서 아래로, 나중에 로드된 값이 우선):
1. .env.production.local      (최우선, Git 무시)
2. .env.production
3. .env.local                 (로컬 오버라이드, Git 무시)
4. .env
5. apps/server/.env.production (하위 호환성)
6. apps/server/.env            (하위 호환성)
```

### 3. 환경 변수 목록

#### 필수 환경 변수

| 변수명 | 설명 | 개발 환경 예시 | 프로덕션 예시 |
|--------|------|---------------|--------------|
| `NODE_ENV` | 실행 환경 | `development` | `production` |
| `DATABASE_HOST` | PostgreSQL 호스트 | `localhost` | `postgres` |
| `DATABASE_PORT` | PostgreSQL 포트 | `5432` | `5432` |
| `DATABASE_NAME` | 데이터베이스 이름 | `ai_pass` | `ai_pass` |
| `DATABASE_USER` | 데이터베이스 사용자 | `ai_pass` | `ai_pass` |
| `DATABASE_PASSWORD` | 데이터베이스 비밀번호 | `secret` | `prod_password` (기본값, 프로덕션에서는 환경 변수 권장) |
| `MONGO_HOST` | MongoDB 호스트 | `localhost` | `mongodb` |
| `MONGO_PORT` | MongoDB 포트 | `27017` | `27017` |
| `MONGO_DATABASE` | MongoDB 데이터베이스 | `ai-pass` | `ai-pass` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `xxx.apps.googleusercontent.com` | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | `GOCSPX-xxx` | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | Google OAuth 콜백 URL | `http://localhost:5002/auth/google/callback` | `https://domain.com/auth/google/callback` |

#### 선택적 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `MODEL_SERVER_URL` | AI 모델 서버 URL | 개발: `http://localhost:5001`<br>프로덕션: `http://host.docker.internal:5001` |
| `SEED_ADMIN_EMAIL` | 관리자 이메일 (개발용) | - |
| `SEED_ADMIN_USERNAME` | 관리자 사용자명 (개발용) | - |
| `SERVER_PORT` | 서버 포트 | `5002` |

### 4. 환경 변수 설정 예시

#### 개발 환경 (`.env.local`)

```env
NODE_ENV=development

# PostgreSQL (Docker 컨테이너)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ai_pass
DATABASE_USER=ai_pass
DATABASE_PASSWORD=secret

# MongoDB (Docker 컨테이너)
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=ai-pass

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5002/auth/google/callback

# AI 모델 서버 (로컬 실행)
MODEL_SERVER_URL=http://localhost:5001

# 시드 데이터 (개발용)
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_USERNAME=admin
```

#### 프로덕션 환경 (환경 변수 직접 주입)

**방법 1: 환경 변수 직접 주입** (권장)

```bash
export NODE_ENV=production
export DATABASE_PASSWORD=your_production_password
export GOOGLE_CLIENT_ID=your_production_client_id
export GOOGLE_CLIENT_SECRET=your_production_client_secret
export GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
export MODEL_SERVER_URL=https://model-server.example.com
npm run prod
```

**방법 2: 기본값 사용** (테스트용)

```bash
# DATABASE_PASSWORD 기본값(prod_password) 사용
npm run prod
```

**주의**: 프로덕션 환경에서는 보안을 위해 환경 변수로 직접 주입하는 것을 권장합니다.

---

## Docker 환경 설정

### 1. 개발 환경 (`docker-compose.dev.yml`)

**목적**: 개발 시 PostgreSQL과 MongoDB만 Docker 컨테이너로 실행

**서비스 구성**:
- `postgres`: PostgreSQL 15-alpine
  - 프로젝트: `ai-pass-dev`
  - 컨테이너명: `ai-pass-postgres-dev`
  - 포트: `5432:5432`
  - 볼륨: `ai-pass-postgres-dev`
  - 네트워크: `ai-pass-dev-network`
- `mongodb`: MongoDB 7.0
  - 프로젝트: `ai-pass-dev`
  - 컨테이너명: `ai-pass-mongodb-dev`
  - 포트: `27017:27017`
  - 볼륨: `ai-pass-mongodb-dev`
  - 네트워크: `ai-pass-dev-network`

**특징**:
- client와 server는 로컬에서 실행 (turbo dev)
- DB만 Docker로 관리하여 환경 일관성 유지
- 개발 전용 볼륨 사용 (프로덕션과 분리)
- 프로젝트 이름 분리로 프로덕션과 독립 실행

**사용 방법**:
```bash
# DB 컨테이너 시작 (npm run dev로 자동 실행)
docker-compose -p ai-pass-dev -f docker-compose.dev.yml up -d

# DB 컨테이너 상태 확인
docker-compose -p ai-pass-dev -f docker-compose.dev.yml ps

# DB 컨테이너 로그 확인
docker-compose -p ai-pass-dev -f docker-compose.dev.yml logs -f

# DB 컨테이너 종료 (npm run dev:down로 자동 실행)
docker-compose -p ai-pass-dev -f docker-compose.dev.yml down
```

### 2. 프로덕션 환경 (`docker-compose.yml`)

**목적**: 모든 서비스를 Docker 컨테이너로 실행

**서비스 구성**:
- `postgres`: PostgreSQL 15-alpine
  - 프로젝트: `ai-pass-prod`
  - 컨테이너명: `ai-pass-postgres`
  - 포트: `5432:5432`
  - 볼륨: `ai-pass-postgres-prod`
  - 네트워크: `ai-pass-prod-network`
  - 비밀번호: `${DATABASE_PASSWORD:-prod_password}` (기본값 제공)
- `mongodb`: MongoDB 7.0
  - 프로젝트: `ai-pass-prod`
  - 컨테이너명: `ai-pass-mongodb`
  - 포트: `27017:27017`
  - 볼륨: `ai-pass-mongodb-prod`
  - 네트워크: `ai-pass-prod-network`
- `server`: NestJS 서버
  - 프로젝트: `ai-pass-prod`
  - 컨테이너명: `ai-pass-server`
  - 포트: `5002:5002`
  - 네트워크: `ai-pass-prod-network`
  - 명령어: `npm run start` (프로덕션 모드)
- `client`: React 클라이언트
  - 프로젝트: `ai-pass-prod`
  - 컨테이너명: `ai-pass-client`
  - 포트: `5173:5173`
  - 네트워크: `ai-pass-prod-network`
  - 명령어: `npm run build && npm run preview` (빌드 후 실행)

**특징**:
- 모든 서비스가 Docker 네트워크 내부에서 통신
- 프로덕션 전용 볼륨 사용
- 환경 변수 직접 주입 또는 `.env.production` 사용
- 프로젝트 이름 분리로 개발 환경과 독립 실행
- `POSTGRES_PASSWORD` 기본값 제공 (테스트 환경 지원)

**사용 방법**:
```bash
# 프로덕션 환경 시작
npm run prod

# 프로덕션 환경 종료
npm run prod:down

# 프로덕션 로그 확인
npm run prod:logs
```

### 3. 환경별 Docker 설정 비교

| 항목 | 개발 환경 | 프로덕션 환경 |
|------|----------|-------------|
| **파일** | `docker-compose.dev.yml` | `docker-compose.yml` |
| **프로젝트 이름** | `ai-pass-dev` (`-p ai-pass-dev`) | `ai-pass-prod` (`-p ai-pass-prod`) |
| **서버 실행** | 로컬 (`turbo dev`) | Docker 컨테이너 |
| **클라이언트 실행** | 로컬 (`turbo dev`) | Docker 컨테이너 (빌드 후) |
| **DB 실행** | Docker 컨테이너 | Docker 컨테이너 |
| **환경 변수** | `.env.local` | 환경 변수 직접 주입 또는 `.env.production` |
| **DB 접근** | `localhost:5432` | `postgres:5432` (Docker 서비스 이름) |
| **네트워크** | `ai-pass-dev-network` | `ai-pass-prod-network` |
| **볼륨** | `ai-pass-postgres-dev`, `ai-pass-mongodb-dev` | `ai-pass-postgres-prod`, `ai-pass-mongodb-prod` |
| **컨테이너명** | `-dev` 접미사 | 접미사 없음 |
| **POSTGRES_PASSWORD** | `secret` (기본값) | `prod_password` (기본값, 환경 변수 권장) |

### 4. Docker 네트워크

#### 개발 환경

```
로컬 머신
├── Docker Container (PostgreSQL) → localhost:5432
├── Docker Container (MongoDB) → localhost:27017
├── NestJS Server (로컬 실행) → localhost:5002
│   └── localhost:5432, localhost:27017로 접근
└── React Client (로컬 실행) → localhost:5173
```

#### 프로덕션 환경

```
Docker Network (bridge)
├── postgres (서비스 이름)
│   └── 내부 포트: 5432
├── mongodb (서비스 이름)
│   └── 내부 포트: 27017
├── server (서비스 이름)
│   └── postgres, mongodb로 접근 (Docker DNS)
│   └── 외부 포트: 5002
└── client (서비스 이름)
    └── 외부 포트: 5173
```

---

## 팩토리 디자인 패턴 적용

### 1. 팩토리 패턴 개요

**팩토리 디자인 패턴(Factory Design Pattern)**은 객체 생성 로직을 캡슐화하여, 클라이언트가 직접 객체를 생성하지 않고 팩토리를 통해 생성하는 디자인 패턴입니다.

**현재 프로젝트 적용**:
- **패턴 유형**: Factory Function Pattern (함수형 팩토리 패턴)
- **적용 위치**: `apps/server/src/config/env.config.ts`
- **목적**: 환경 변수를 기반으로 환경별 설정 객체를 동적으로 생성

### 2. 팩토리 함수 구현

```typescript
// env.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  // 팩토리 함수: 환경 변수를 기반으로 설정 객체 생성
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';
  
  const config: Partial<EnvironmentVariables> = {
    // 환경별 기본값 적용
    DATABASE_HOST: process.env.DATABASE_HOST || 
      (isProduction ? 'postgres' : 'localhost'),
    MONGO_HOST: process.env.MONGO_HOST || 
      (isProduction ? 'mongodb' : 'localhost'),
    // ...
  };
  
  return config;  // 생성된 설정 객체 반환
});
```

### 3. 팩토리 패턴의 핵심 요소

| 요소 | 설명 | 구현 |
|------|------|------|
| **팩토리 함수** | 객체를 생성하는 함수 | `registerAs('app', () => { ... })` |
| **생성 대상** | 팩토리가 생성하는 객체 | 설정 객체 (Configuration Object) |
| **생성 조건** | 환경에 따라 다른 객체 생성 | `isProduction` 조건 분기 |
| **클라이언트** | 팩토리를 사용하는 코드 | `ConfigService.get('app')` |

### 4. 환경별 기본값 분리

#### 개발 환경 기본값

```typescript
DATABASE_HOST: process.env.DATABASE_HOST || 'localhost'
MONGO_HOST: process.env.MONGO_HOST || 'localhost'
MODEL_SERVER_URL: process.env.MODEL_SERVER_URL || 'http://localhost:5001'
GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 
  'http://localhost:5002/auth/google/callback'
```

#### 프로덕션 환경 기본값

```typescript
DATABASE_HOST: process.env.DATABASE_HOST || 'postgres'  // Docker 서비스 이름
MONGO_HOST: process.env.MONGO_HOST || 'mongodb'          // Docker 서비스 이름
MODEL_SERVER_URL: process.env.MODEL_SERVER_URL || 
  'http://host.docker.internal:5001'
GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 
  'https://your-production-domain.com/auth/google/callback'
```

### 5. 팩토리 패턴 사용 흐름

```
1. 애플리케이션 시작
   ↓
2. ConfigModule.forRoot({ load: [appConfig] })
   ↓
3. registerAs('app', factoryFunction) 실행
   ↓
4. 팩토리 함수 실행 (지연 평가):
   - 환경 변수 읽기 (process.env)
   - NODE_ENV 확인
   - 환경별 기본값 적용
   - 설정 객체 생성
   ↓
5. 생성된 설정 객체를 'app' 네임스페이스에 저장
   ↓
6. 다른 모듈에서 ConfigService.get('app')로 접근
```

### 6. 팩토리 패턴의 장점

1. **캡슐화**: 설정 생성 로직이 한 곳에 집중
2. **유연성**: 환경에 따라 다른 설정 생성 가능
3. **타입 안전성**: TypeScript 인터페이스로 타입 보장
4. **단일 책임**: 설정 생성과 사용 분리
5. **확장성**: 새로운 환경 변수 추가 시 팩토리 함수만 수정

---

## Google OAuth 인증 시스템

### 1. 인증 아키텍처

**인증 방식**: Google OAuth 2.0 (Passport.js)

**주요 컴포넌트**:
- `GoogleStrategy`: Google OAuth 전략 구현
- `AuthService`: 사용자 찾기/생성 로직
- `AuthController`: 인증 엔드포인트
- `User` Entity: 사용자 기본 정보
- `OAuthAccount` Entity: OAuth 계정 정보

### 2. 인증 흐름

```
1. 사용자가 /auth/google 접근
   ↓
2. Google 로그인 페이지로 리다이렉트
   ↓
3. 사용자 인증 후 /auth/google/callback으로 리다이렉트
   ↓
4. Google에서 Access Token과 사용자 정보 제공
   ↓
5. GoogleStrategy.validate() 실행
   ↓
6. AuthService.findOrCreateUser() 호출
   ↓
7. provider + provider_user_id로 기존 계정 조회
   ↓
8. 없으면 신규 User 생성 + OAuth 계정 생성
   ↓
9. 세션에 사용자 정보 저장
   ↓
10. 리다이렉트 또는 사용자 정보 반환
```

### 3. 사용자 생성 로직

#### 완전 분리 방식

**설계 원칙**:
- 같은 이메일이라도 다른 OAuth 제공자로 로그인하면 별도 사용자로 취급
- 이메일은 provider를 포함한 고유한 형식으로 생성

**이메일 생성 규칙**:
```typescript
// 이메일이 있는 경우
user@gmail.com → google_user@gmail.com

// 이메일이 없는 경우
google_123456789@oauth.local
```

**예시**:
- Google OAuth로 `user@gmail.com` 로그인 → `google_user@gmail.com` (User ID: 1)
- Facebook OAuth로 `user@gmail.com` 로그인 → `facebook_user@gmail.com` (User ID: 2)
- 같은 Google 계정으로 다시 로그인 → 기존 User ID: 1 반환

### 4. 데이터베이스 구조

#### User Entity (PostgreSQL)

```typescript
@Entity('Users')
export class User {
  id: number;                    // Primary Key
  email: string;                  // 고유 (provider 포함)
  username: string;
  profile_picture: string | null;
  role: UserRole;
  oauth_accounts: OAuthAccount[]; // One-to-Many 관계
}
```

#### OAuthAccount Entity (PostgreSQL)

```typescript
@Entity('oauth_accounts')
export class OAuthAccount {
  id: number;                     // Primary Key
  user_id: number;                // Foreign Key → User.id
  provider: string;               // 'google', 'facebook', etc.
  provider_user_id: string;       // OAuth 제공자의 사용자 ID
  profile_metadata: Record<string, any> | null;
  
  // Unique Index: (provider, provider_user_id)
}
```

### 5. 환경 변수 설정

#### Google OAuth 설정

```env
# .env.local (개발 환경)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5002/auth/google/callback
```

#### Google Cloud Console 설정

1. **OAuth 2.0 클라이언트 ID 생성**
   - Google Cloud Console → APIs & Services → Credentials
   - OAuth 2.0 Client ID 생성
   - 승인된 리디렉션 URI 추가: `http://localhost:5002/auth/google/callback`

2. **환경 변수에 설정**
   - `GOOGLE_CLIENT_ID`: 클라이언트 ID
   - `GOOGLE_CLIENT_SECRET`: 클라이언트 시크릿
   - `GOOGLE_CALLBACK_URL`: 콜백 URL

### 6. 인증 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/auth/google` | GET | Google 로그인 시작 |
| `/auth/google/callback` | GET | Google OAuth 콜백 처리 |
| `/auth/logout` | POST | 로그아웃 |
| `/auth/me` | GET | 현재 사용자 정보 조회 |

### 7. 보안 고려사항

1. **환경 변수 보안**
   - `GOOGLE_CLIENT_SECRET`은 절대 Git에 커밋하지 않기
   - 프로덕션에서는 환경 변수로 직접 주입

2. **세션 관리**
   - 현재는 세션 기반 인증 (향후 JWT로 전환 가능)
   - 세션 쿠키는 HttpOnly, Secure 플래그 설정 권장

3. **OAuth 콜백 URL**
   - 개발: `http://localhost:5002/auth/google/callback`
   - 프로덕션: `https://your-domain.com/auth/google/callback`
   - Google Cloud Console에 정확히 등록 필요

---

## 아키텍처 다이어그램

### 1. 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    개발 환경 (npm run dev)               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐    ┌──────────────────┐        │
│  │  Docker Container │    │  Docker Container │        │
│  │   PostgreSQL      │    │    MongoDB        │        │
│  │   localhost:5432  │    │   localhost:27017 │        │
│  └──────────────────┘    └──────────────────┘        │
│           ↑                        ↑                    │
│           │                        │                    │
│           └────────┬───────────────┘                    │
│                    │ localhost 접근                      │
│                    ↓                                     │
│  ┌──────────────────────────────────────┐               │
│  │  Turbo Dev (로컬 실행)                │               │
│  │  ├── React Client (localhost:5173)    │               │
│  │  └── NestJS Server (localhost:5002)   │               │
│  │      └── .env.local 로드              │               │
│  └──────────────────────────────────────┘               │
│                    ↓                                     │
│  ┌──────────────────────────────────────┐               │
│  │  AI Model Server (로컬 실행)          │               │
│  │  localhost:5001                       │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                프로덕션 환경 (npm run prod)               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Docker Network (bridge)                 │   │
│  │                                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │PostgreSQL│  │ MongoDB  │  │  Server  │      │   │
│  │  │postgres  │  │ mongodb  │  │  :5002   │      │   │
│  │  └──────────┘  └──────────┘  └──────────┘      │   │
│  │       ↑             ↑             ↑            │   │
│  │       └─────────────┴─────────────┘            │   │
│  │            Docker 서비스 이름 사용               │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↑                               │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Client (빌드 후 preview)                       │   │
│  │  :5173                                           │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↑                               │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AI Model Server (외부 또는 host.docker.internal)│   │
│  │  http://host.docker.internal:5001                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2. 환경 변수 관리 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    환경 변수 소스                        │
├─────────────────────────────────────────────────────────┤
│  .env.development.local  │  .env.production.local       │
│  .env.local              │  .env.production             │
│  .env.development        │  .env                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              env.helpers.ts (경로 해결)                  │
│  - resolveEnvPaths()                                    │
│  - 환경별 파일 우선순위 결정                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              ConfigModule (NestJS)                      │
│  - 환경 변수 파일 로드                                   │
│  - 팩토리 함수 실행                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│         env.config.ts (팩토리 함수)                      │
│  registerAs('app', () => {                              │
│    // 환경 변수 읽기                                      │
│    // 환경별 기본값 적용                                  │
│    // 설정 객체 생성                                      │
│    return config;                                        │
│  })                                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              ConfigService                               │
│  - 'app' 네임스페이스로 설정 저장                        │
│  - 다른 모듈에서 접근 가능                                │
└─────────────────────────────────────────────────────────┘
```

### 3. Google OAuth 인증 흐름

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│ 사용자   │         │  Client  │         │  Server  │
└────┬────┘         └────┬─────┘         └────┬─────┘
     │                   │                    │
     │ 1. /auth/google 클릭                    │
     │──────────────────>│                    │
     │                   │ 2. GET /auth/google│
     │                   │──────────────────>│
     │                   │                    │
     │                   │ 3. Google 로그인 페이지로 리다이렉트
     │                   │<──────────────────│
     │                   │                    │
     │ 4. Google 로그인                        │
     │<──────────────────│                    │
     │                   │                    │
     │ 5. /auth/google/callback?code=xxx      │
     │──────────────────>│                    │
     │                   │ 6. GET /auth/google/callback?code=xxx
     │                   │──────────────────>│
     │                   │                    │
     │                   │ 7. GoogleStrategy.validate()
     │                   │    - Access Token으로 사용자 정보 조회
     │                   │    - AuthService.findOrCreateUser()
     │                   │    - User 생성 또는 조회
     │                   │                    │
     │                   │ 8. 세션에 사용자 정보 저장
     │                   │                    │
     │                   │ 9. 리다이렉트 또는 사용자 정보 반환
     │                   │<──────────────────│
     │                   │                    │
     │ 10. 인증 완료                              │
     │<──────────────────│                    │
     │                   │                    │
```

---

## 문제 해결

### 1. 개발 환경 문제

#### DB 연결 실패

**증상**: `ECONNREFUSED localhost:5432`

**해결**:
```bash
# Docker 컨테이너가 실행 중인지 확인
docker-compose -p ai-pass-dev -f docker-compose.dev.yml ps

# 컨테이너 재시작
docker-compose -p ai-pass-dev -f docker-compose.dev.yml restart postgres mongodb

# .env.local에서 DATABASE_HOST=localhost 확인
```

#### 환경 변수 로드 실패

**증상**: 환경 변수 에러 발생

**해결**:
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 환경 변수 이름이 정확한지 확인 (대소문자 구분)
3. 애플리케이션 재시작

#### Turbo dev 실행 실패

**증상**: `turbo dev` 실행 시 에러

**해결**:
```bash
# 의존성 재설치
npm install

# Turbo 캐시 클리어
rm -rf .turbo

# 다시 실행
npm run dev
```

### 2. 프로덕션 환경 문제

#### POSTGRES_PASSWORD 미설정 에러

**증상**: `Database is uninitialized and superuser password is not specified`

**원인**: `docker-compose.yml`에서 `POSTGRES_PASSWORD` 환경 변수가 없을 때 빈 값으로 설정됨

**해결**:
```bash
# 방법 1: 환경 변수 설정 (권장)
export DATABASE_PASSWORD=your_production_password
npm run prod

# 방법 2: 기본값 사용 (테스트용)
# docker-compose.yml에서 기본값(prod_password)이 자동으로 사용됨
npm run prod
```

#### 컨테이너 시작 실패

**증상**: `docker-compose up` 실행 시 에러

**해결**:
```bash
# 환경 변수 확인
echo $DATABASE_PASSWORD
echo $GOOGLE_CLIENT_ID

# 컨테이너 로그 확인
docker-compose -p ai-pass-prod logs server

# 컨테이너 재시작
docker-compose -p ai-pass-prod restart server
```

#### 환경 변수 누락

**증상**: 필수 환경 변수 에러

**해결**:
1. 환경 변수가 설정되었는지 확인
2. `docker-compose.yml`의 `environment` 섹션 확인
3. 환경 변수 직접 주입 또는 `.env.production` 파일 사용

#### 개발/프로덕션 환경 컨테이너 교체 문제

**증상**: `npm run dev` 실행 시 프로덕션 컨테이너가 삭제되고 개발 컨테이너로 교체됨

**원인**: 같은 프로젝트 이름을 사용하여 Docker Compose가 같은 프로젝트로 인식

**해결**:
- `package.json` 스크립트에 `-p` 옵션 추가
- 개발 환경: `-p ai-pass-dev`
- 프로덕션 환경: `-p ai-pass-prod`
- 이제 두 환경이 독립적으로 실행됨

#### YAML 중복 정의 에러

**증상**: `yaml: unmarshal errors: mapping key "networks" already defined`

**원인**: `docker-compose.yml` 또는 `docker-compose.dev.yml`에서 `networks` 키가 두 번 정의됨

**해결**:
- 최상위 레벨에서 `networks`를 한 번만 정의
- 파일 구조를 올바르게 정리

#### 프로덕션 빌드 실패

**증상 1: Client 빌드 실패**
```
npm error Lifecycle script `build` failed with error
npm error command sh -c tsc -b && vite build
```

**증상 2: Server 실행 실패**
```
Error: Cannot find module '/usr/src/app/apps/server/dist/src/main'
```

**원인**:
- Dockerfile이 개발 모드(`npm run dev`)로 설정되어 빌드 없이 실행
- `docker-compose.yml`에서 볼륨 마운트로 소스 코드를 덮어써서 빌드 결과물이 없음
- 빌드 과정이 없어서 TypeScript 컴파일 및 번들링이 수행되지 않음

**해결**:

**1단계: Server Dockerfile 수정**
```dockerfile
# 빌드 단계 추가
RUN npm run build

# 프로덕션 모드로 실행
CMD ["npm", "run", "start"]
```

**2단계: Client Dockerfile 수정**
```dockerfile
# 빌드 단계 추가
RUN npm run build

# 프로덕션 모드로 실행
CMD ["npm", "run", "preview"]
```

**3단계: docker-compose.yml 수정**
- 볼륨 마운트 제거 (프로덕션에서는 빌드된 파일 사용)
- command 제거 (Dockerfile의 CMD 사용)

**4단계: 재빌드 및 실행**
```bash
# 기존 컨테이너 제거 및 재빌드
npm run prod:down
npm run prod:build

# 또는
docker-compose -p ai-pass-prod down
docker-compose -p ai-pass-prod up -d --build
```

**검증**:
- 빌드가 완료된 후 컨테이너가 정상적으로 시작됨
- Server: `dist/src/main` 파일이 존재하고 실행됨
- Client: `dist` 디렉토리에 빌드된 파일이 생성되고 preview 모드로 실행됨

### 3. OAuth 인증 문제

#### Google OAuth 에러

**증상**: `OAuth2Strategy requires a clientID option`

**해결**:
1. `.env.local`에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 설정 확인
2. Google Cloud Console에서 OAuth 클라이언트 ID 확인
3. 콜백 URL이 Google Cloud Console에 등록되어 있는지 확인

#### 콜백 URL 불일치

**증상**: `redirect_uri_mismatch` 에러

**해결**:
1. Google Cloud Console → APIs & Services → Credentials
2. OAuth 2.0 클라이언트 ID → 승인된 리디렉션 URI 확인
3. `.env.local`의 `GOOGLE_CALLBACK_URL`과 일치하는지 확인

---

## 체크리스트

### 개발 환경 설정

- [ ] `.env.local` 파일 생성 및 설정
- [ ] `npm run dev` 실행 확인
- [ ] DB 컨테이너 실행 확인 (`docker-compose -f docker-compose.dev.yml ps`)
- [ ] client 접근 확인 (`http://localhost:5173`)
- [ ] server 접근 확인 (`http://localhost:5002`)
- [ ] Google OAuth 로그인 테스트

### 프로덕션 환경 설정

- [ ] 프로덕션 환경 변수 설정
- [ ] `npm run build` 실행
- [ ] `npm run prod` 실행 확인
- [ ] 모든 컨테이너 실행 확인 (`docker-compose ps`)
- [ ] 로그 확인 (`npm run prod:logs`)
- [ ] 서비스 상태 점검

---

## 참고 자료

- [환경 변수 관리 가이드](./ENV_VARIABLES.md)
- [배포 가이드](./DEPLOYMENT.md)
- [Google OAuth 로그인 시퀀스](./google-oauth-login-sequence.md)
- [문제 해결 가이드](../TROUBLESHOOTING.md)

---

**작성일**: 2025-11-14  
**버전**: 1.0  
**작성자**: AI Assistant

