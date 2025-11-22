# 배포 및 실행 가이드

## 📋 목차

1. [로컬 개발 환경](#로컬-개발-환경)
2. [프로덕션 배포](#프로덕션-배포)
3. [Docker 사용](#docker-사용)
4. [환경 변수 설정](#환경-변수-설정)

---

## 로컬 개발 환경

### 전제 조건

- Node.js 18 이상
- PostgreSQL (로컬 또는 Docker)
- MongoDB (로컬 또는 Docker)
- AI 모델 서버 (로컬 실행)

### 실행 방법

#### 1. 데이터베이스만 Docker로 실행 (권장)

```bash
# 데이터베이스 컨테이너만 시작
docker-compose -f docker-compose.dev.yml up -d postgres mongodb

# 서버는 로컬에서 실행
cd apps/server
npm run dev
```

#### 2. 완전 로컬 실행

```bash
# PostgreSQL, MongoDB를 로컬에 직접 설치하여 실행
# .env.local에서 localhost로 설정
cd apps/server
npm run dev
```

### 환경 변수 설정

로컬 개발 시에는 **프로젝트 루트의 `.env.local`** 파일을 사용합니다:

```env
# .env.local
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
# ... 기타 설정
```

**중요**: `npm run dev`로 실행할 때는:
- ✅ 프로젝트 루트의 `.env.local` 사용
- ✅ 로컬 환경 변수 직접 사용
- ❌ `docker-compose.yml` 사용 안 함

---

## 프로덕션 배포

### Docker Compose 사용 (권장)

프로덕션 환경에서는 `docker-compose.yml`을 사용하여 모든 서비스를 컨테이너로 실행합니다.

#### 1. 환경 변수 설정

프로덕션 환경 변수를 설정합니다:

**방법 1: 환경 변수 직접 주입 (권장)**

```bash
export NODE_ENV=production
export DATABASE_PASSWORD=your_production_password
export GOOGLE_CLIENT_ID=your_production_client_id
export GOOGLE_CLIENT_SECRET=your_production_client_secret
# ... 기타 환경 변수

docker-compose up -d
```

**방법 2: .env.production 파일 사용**

```bash
# .env.production 파일 생성 (Git에 커밋하지 않음)
cat > .env.production << EOF
NODE_ENV=production
DATABASE_PASSWORD=your_production_password
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
# ... 기타 환경 변수
EOF

# docker-compose.yml에서 env_file 주석 해제 후
docker-compose up -d
```

#### 2. 빌드 및 실행

```bash
# 프로덕션 빌드
npm run build

# Docker Compose로 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f server
```

#### 3. 서비스 관리

```bash
# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose down

# 서비스 재시작
docker-compose restart server

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f server
```

---

## Docker 사용

### 개발 환경 (선택사항)

개발 중에 데이터베이스만 Docker로 실행하고 싶을 때:

```bash
# docker-compose.dev.yml 사용
docker-compose -f docker-compose.dev.yml up -d

# 서버는 로컬에서 실행
cd apps/server
npm run dev
```

### 프로덕션 환경

```bash
# docker-compose.yml 사용 (기본)
docker-compose up -d
```

### 파일 비교

| 파일 | 용도 | 서버 실행 |
|------|------|----------|
| `docker-compose.yml` | 프로덕션 | ✅ Docker 컨테이너 |
| `docker-compose.dev.yml` | 개발 (DB만) | ❌ 로컬 실행 |

---

## 환경 변수 설정

### 로컬 개발 (`npm run dev`)

**파일**: `.env.local` (프로젝트 루트)

```env
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
# ... 기타 설정
```

**로드 방식**:
- NestJS `ConfigModule`이 자동으로 `.env.local` 로드
- Docker Compose 사용 안 함

### 프로덕션 (`docker-compose up`)

**방법 1: 환경 변수 직접 주입** (권장)

```bash
export DATABASE_PASSWORD=prod_password
export GOOGLE_CLIENT_ID=prod_client_id
docker-compose up -d
```

**방법 2: .env.production 파일**

1. `.env.production` 파일 생성
2. `docker-compose.yml`에서 `env_file` 주석 해제:
   ```yaml
   env_file:
     - .env.production
   ```

**로드 방식**:
- Docker Compose의 `environment` 섹션 사용
- 환경 변수 직접 주입 또는 `.env.production` 파일

---

## 실행 시나리오

### 시나리오 1: 완전 로컬 개발

```bash
# 1. 환경 변수 설정
cp .env.example .env.local
# .env.local 편집

# 2. 로컬에서 PostgreSQL, MongoDB 실행
# (또는 docker-compose.dev.yml로 DB만 실행)

# 3. 서버 실행
cd apps/server
npm run dev
```

**특징**:
- ✅ Docker Compose 사용 안 함
- ✅ 로컬 환경 변수만 사용
- ✅ 빠른 개발 사이클

### 시나리오 2: Docker로 DB만 사용

```bash
# 1. DB 컨테이너 시작
docker-compose -f docker-compose.dev.yml up -d postgres mongodb

# 2. .env.local 설정 (DATABASE_HOST=localhost)

# 3. 서버 로컬 실행
cd apps/server
npm run dev
```

**특징**:
- ✅ DB는 Docker로 관리
- ✅ 서버는 로컬 실행
- ✅ 개발 편의성과 일관성 균형

### 시나리오 3: 프로덕션 배포

```bash
# 1. 환경 변수 설정
export NODE_ENV=production
export DATABASE_PASSWORD=prod_password
# ... 기타 환경 변수

# 2. 빌드
npm run build

# 3. Docker Compose 실행
docker-compose up -d

# 4. 로그 확인
docker-compose logs -f server
```

**특징**:
- ✅ 모든 서비스가 Docker 컨테이너로 실행
- ✅ 프로덕션 환경 변수 사용
- ✅ 격리된 환경

---

## 문제 해결

### 로컬 개발 시 환경 변수가 로드되지 않음

**증상**: `npm run dev` 실행 시 환경 변수 에러

**해결**:
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 환경 변수 이름이 정확한지 확인
3. 애플리케이션 재시작

### Docker에서 환경 변수가 로드되지 않음

**증상**: `docker-compose up` 실행 시 환경 변수 에러

**해결**:
1. 환경 변수가 설정되었는지 확인:
   ```bash
   echo $DATABASE_PASSWORD
   ```
2. `docker-compose.yml`의 `environment` 섹션 확인
3. 컨테이너 재시작:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### 포트 충돌

**증상**: 포트가 이미 사용 중

**해결**:
1. 사용 중인 포트 확인:
   ```bash
   lsof -i :5002
   ```
2. `.env.local`에서 포트 변경
3. 또는 기존 프로세스 종료

---

## 체크리스트

### 로컬 개발 설정

- [ ] `.env.local` 파일 생성 및 설정
- [ ] PostgreSQL, MongoDB 실행 (로컬 또는 Docker)
- [ ] AI 모델 서버 실행
- [ ] `npm run dev` 실행 확인

### 프로덕션 배포

- [ ] 프로덕션 환경 변수 설정
- [ ] `npm run build` 실행
- [ ] `docker-compose.yml` 확인
- [ ] `docker-compose up -d` 실행
- [ ] 로그 확인 및 서비스 상태 점검

---

## 추가 리소스

- [환경 변수 관리 가이드](./ENV_VARIABLES.md)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [NestJS 배포 가이드](https://docs.nestjs.com/recipes/deployment)

