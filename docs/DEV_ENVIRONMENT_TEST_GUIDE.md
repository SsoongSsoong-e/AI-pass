# 개발 환경 Docker Compose 테스트 가이드

이 가이드는 개발 환경에서 프로덕션과 동일한 구조로 전체 서비스를 Docker Compose로 실행하는 방법을 설명합니다.

## 개요

- **프로덕션과 동일한 구조**: postgres, mongodb, model-server, backend, frontend, nginx
- **포트 통일**: 모든 환경에서 백엔드 포트 5002 사용
- **HTTPS 지원**: 자체 서명 인증서를 사용한 HTTPS 테스트
- **자동 빌드**: 프론트엔드 자동 빌드 및 nginx 서빙

## 사전 준비

### 1. 자체 서명 SSL 인증서 생성

먼저 개발용 HTTPS를 위한 자체 서명 인증서를 생성해야 합니다.

```bash
# 인증서 생성 스크립트 실행
npm run dev:ssl

# 또는 수동으로 생성
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/localhost-key.pem \
  -out nginx/ssl/localhost.pem \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=AI-Pass-Dev/CN=localhost"
```

생성된 파일:
- `nginx/ssl/localhost.pem` - 인증서
- `nginx/ssl/localhost-key.pem` - 개인키

## 실행 방법

### 방법 1: 전체 서비스 실행 (권장)

프로덕션과 동일한 구조로 모든 서비스를 Docker Compose로 실행합니다.

```bash
# 전체 서비스 빌드 및 실행
npm run dev:full

# 로그 확인
npm run dev:full:logs

# 서비스 중지
npm run dev:full:stop
```

**실행되는 서비스:**
- PostgreSQL (포트: 5432)
- MongoDB (포트: 27017)
- AI 모델 서버 (내부 네트워크: 5001)
- 백엔드 서버 (내부 네트워크: 5002, 개발 모드)
- 프론트엔드 빌더 (자동 빌드 후 종료)
- Nginx 리버스 프록시 (HTTP: 8080, HTTPS: 8443)

### 방법 2: 로컬 개발 모드

DB만 Docker로 실행하고, 프론트엔드와 백엔드는 로컬에서 실행합니다.

```bash
# DB만 실행
npm run dev

# 프론트엔드와 백엔드가 로컬에서 turbo dev로 실행됨
```

**실행되는 서비스:**
- PostgreSQL (Docker, 포트: 5432)
- MongoDB (Docker, 포트: 27017)
- 프론트엔드 (로컬, 포트: 5173)
- 백엔드 (로컬, 포트: 5002)

## 접속 정보

### 전체 서비스 실행 시 (npm run dev:full)

- **프론트엔드**: https://localhost:8443
- **API**: https://localhost:8443/api
- **Swagger 문서**: https://localhost:8443/api

### 로컬 개발 모드 시 (npm run dev)

- **프론트엔드**: http://localhost:5173
- **API**: http://localhost:5002/api
- **Swagger 문서**: http://localhost:5002/api

## 브라우저 접속 시 인증서 경고 해결

자체 서명 인증서를 사용하므로 브라우저에서 보안 경고가 표시됩니다.

### Chrome/Edge
1. 경고 페이지에서 **"고급"** 또는 **"Advanced"** 클릭
2. **"localhost(안전하지 않음)으로 이동"** 또는 **"Proceed to localhost (unsafe)"** 클릭

### Firefox
1. 경고 페이지에서 **"고급"** 클릭
2. **"예외 추가"** 클릭
3. **"보안 예외 확인"** 클릭

### Safari
1. 경고 표시 후 자동으로 계속 진행 옵션 제공
2. 또는 "자세히 보기" → "웹사이트 방문" 클릭

## 서비스 상태 확인

### Docker 컨테이너 상태 확인

```bash
docker-compose -p ai-pass-dev -f docker-compose.dev.yml ps
```

### 특정 서비스 로그 확인

```bash
# 백엔드 로그
docker-compose -p ai-pass-dev -f docker-compose.dev.yml logs -f backend

# 프론트엔드 빌더 로그
docker-compose -p ai-pass-dev -f docker-compose.dev.yml logs frontend-builder

# Nginx 로그
docker-compose -p ai-pass-dev -f docker-compose.dev.yml logs -f nginx

# 모든 서비스 로그
docker-compose -p ai-pass-dev -f docker-compose.dev.yml logs -f
```

### 서비스 헬스 체크

```bash
# PostgreSQL 연결 확인
docker exec -it ai-pass-postgres-dev pg_isready -U ai_pass

# MongoDB 연결 확인
docker exec -it ai-pass-mongodb-dev mongosh --eval "db.adminCommand('ping')"

# 백엔드 API 확인
curl https://localhost:8443/api -k

# Swagger 문서 확인
curl https://localhost:8443/api -k | grep swagger
```

## API 테스트

### Swagger UI 사용

1. 브라우저에서 접속: https://localhost:8443/api
2. Swagger UI에서 API 문서 확인 및 테스트 가능

### cURL 사용

```bash
# API 헬스 체크 (자체 서명 인증서 무시: -k)
curl -k https://localhost:8443/api

# 특정 API 테스트 예시
curl -k -X GET https://localhost:8443/api/users \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

## 문제 해결

### 포트 충돌

기본 포트가 이미 사용 중인 경우, 환경 변수로 변경:

```bash
FORWARD_HTTP_PORT=8081 FORWARD_HTTPS_PORT=8444 npm run dev:full
```

### 인증서 파일이 없는 경우

```bash
npm run dev:ssl
```

### 컨테이너 재시작이 필요한 경우

```bash
# 모든 서비스 재시작
npm run dev:full:stop
npm run dev:full

# 특정 서비스만 재시작
docker-compose -p ai-pass-dev -f docker-compose.dev.yml restart backend
```

### 볼륨 정리

개발 데이터를 완전히 삭제하려면:

```bash
# 컨테이너와 볼륨 모두 삭제
docker-compose -p ai-pass-dev -f docker-compose.dev.yml down -v
```

## 환경 변수 설정

개발 환경에서 사용할 수 있는 환경 변수:

```bash
# .env 파일 또는 환경 변수로 설정
DATABASE_NAME=ai_pass
DATABASE_USER=ai_pass
DATABASE_PASSWORD=secret
MONGO_DATABASE=ai-pass
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=https://localhost:8443/api/auth/google/callback
SESSION_SECRET=dev-secret-key-change-in-production
FRONTEND_URL=https://localhost:8443
```

## 프로덕션과의 차이점

| 항목 | 개발 환경 | 프로덕션 환경 |
|------|-----------|--------------|
| SSL 인증서 | 자체 서명 (localhost) | Let's Encrypt (실제 도메인) |
| 백엔드 모드 | 개발 모드 (watch) | 프로덕션 모드 |
| 포트 | HTTP: 8080, HTTPS: 8443 | HTTP: 80, HTTPS: 443 |
| 프론트엔드 | 빌드 후 nginx 서빙 | 빌드 후 nginx 서빙 |
| 백엔드 포트 | 5002 | 5002 (통일) |

## 다음 단계

1. **API 테스트**: Swagger UI에서 API 테스트
2. **프론트엔드 테스트**: 브라우저에서 UI 확인
3. **인증 테스트**: Google OAuth 로그인 테스트
4. **E2E 테스트**: 전체 플로우 테스트

## 참고 자료

- [프로덕션 배포 가이드](./NGINX_DEPLOYMENT_COMPREHENSIVE.md)
- [환경 변수 문서](./ENV_VARIABLES.md)
- [RESTful API 테스트 가이드](./RESTFUL_API_TEST_GUIDE.md)

