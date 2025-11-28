# AI-Pass 배포 종합 보고서

## 목차

1. [개요](#개요)
2. [아키텍처 설계 결정](#아키텍처-설계-결정)
3. [배포 구조](#배포-구조)
4. [인증 시스템](#인증-시스템)
5. [Nginx 설정](#nginx-설정)
6. [HTTPS/SSL 설정](#httpsssl-설정)
7. [배포 절차](#배포-절차)
8. [문제 해결](#문제-해결)
9. [참고 자료](#참고-자료)

---

## 개요

이 문서는 AI-Pass 프로젝트의 프로덕션 배포를 위한 종합 가이드입니다. Nginx 리버스 프록시를 사용한 서브 패스 방식 배포 구조와 세션 기반 인증 시스템을 중심으로 설명합니다.

### 시스템 구성 요소

- **프론트엔드**: React SPA (Vite)
- **백엔드**: NestJS (REST API + WebSocket)
- **리버스 프록시**: Nginx
- **인증**: 세션 기반 (PostgreSQL 세션 스토어)
- **데이터베이스**: PostgreSQL, MongoDB
- **컨테이너**: Docker Compose

---

## 아키텍처 설계 결정

### 1. 서브 패스 vs 서브 도메인

#### 선택: 서브 패스 방식

```
구조:
https://example.com/          → React SPA
https://example.com/api/*      → NestJS REST API
https://example.com/socket.io/* → NestJS WebSocket
```

#### 선택 이유  - (기존에 존재하는 단일 도메인 + 최소한의 인프라와 비용으로 설계 => 단일 SSL 인증서 + 단순한 CORS 설정 문제 => 서브패스 방식 결정  ++ 세션 방식을 사용하게 될 경우, 세션 쿠키가 모든 경로에서 자동 적용되어 호환성 높음) 

**서브 패스 방식의 장점:**

1. **쿠키 공유 자동**
   - 같은 도메인에서 쿠키 자동 전송
   - `sameSite: 'lax'` 설정으로 충분
   - 추가 설정 불필요

2. **CORS 설정 단순**
   - 같은 origin이므로 CORS 설정 최소화
   - `credentials: true`만으로 충분

3. **단일 SSL 인증서**
   - 하나의 도메인만 인증서 필요
   - 비용 절감

4. **세션 기반 인증과 완벽 호환**
   - 세션 쿠키가 모든 경로에서 자동 전송
   - `path: '/'` 설정으로 모든 경로 접근 가능

5. **구현 단순**
   - 단일 도메인 관리
   - DNS 설정 단순

**서브 도메인 방식의 단점 (현재 시스템에 부적합):**

1. 쿠키 공유 복잡 (`domain: '.example.com'`, `sameSite: 'none'` 필요)
2. CORS 설정 복잡 (여러 도메인 허용 필요)
3. SSL 인증서 추가 필요 (와일드카드 또는 다중 도메인)
4. 구현 복잡도 증가

### 2. 세션 vs 토큰 인증

#### 선택: 세션 기반 인증

#### 선택 이유 ( )

**세션 기반 인증의 장점:**

1. **Google OAuth와 완벽 통합**
   - Passport.js는 세션 기반으로 설계됨
   - `req.login()` 한 줄로 세션 저장
   - 추가 로직 불필요

2. **WebSocket 자동 통합**
   - Socket.io가 세션 쿠키 자동 사용
   - Handshake 단계에서 자동 인증
   - 수동 구현 불필요

3. **즉시 무효화 가능**
   ```typescript
   req.session.destroy();  // 즉시 무효화
   ```
   - 로그아웃 시 즉시 접근 차단
   - 비밀번호 변경 시 즉시 반영

4. **보안 강화**
   - `httpOnly: true` 쿠키로 XSS 방지
   - 서버에서 세션 관리
   - 클라이언트에 민감 정보 저장 불필요

5. **구현 단순**
   ```typescript
   app.use(session({ ... }));
   app.use(passport.initialize());
   app.use(passport.session());
   // 완료!
   ```

**토큰 기반 인증의 문제점 (현재 시스템에 부적합):**

1. **즉시 무효화 불가능**
   - 토큰은 만료 시간까지 유효
   - 블랙리스트 관리 필요 (Redis 등 추가 인프라)
   - 모든 요청마다 블랙리스트 확인 (성능 저하)

2. **토큰 갱신 로직 복잡**
   - Access Token + Refresh Token 패턴 필요
   - 클라이언트 로직 복잡
   - 동시 요청 시 여러 번 갱신 시도 가능

3. **WebSocket 인증 복잡**
   - 쿼리 파라미터 사용 시 보안 취약 (URL 노출)
   - 연결 후 별도 인증 단계 필요
   - 수동 구현 필요

4. **OAuth 통합 복잡**
   - OAuth 콜백 후 토큰 생성 로직 필요
   - Passport.js의 기본 동작과 다름
   - 추가 구현 필요

5. **서버 확장 시 복잡도 증가**
   - 블랙리스트 공유를 위해 Redis 필요
   - 모든 요청마다 Redis 확인

### 3. API Prefix 사용

#### 선택: Global Prefix (`/api`)

```typescript
// main.ts
app.setGlobalPrefix('api');
```

#### 선택 이유

1. **일관성**
   - 내부 경로와 외부 경로 일치
   - 개발/프로덕션 환경 일치

2. **명확한 구분**
   - 프론트엔드 경로와 API 경로 분리
   - 경로 충돌 방지

3. **버전 관리 용이**
   - `/api/v1`, `/api/v2` 구조 가능
   - 확장성 확보


---

## 배포 구조

### 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 브라우저                       │
│  - React Router (클라이언트 라우팅)                       │
│  - 세션 쿠키 (connect.sid) 자동 전송                      │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTPS (443)
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Nginx 컨테이너 (서브 패스 방식)               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  location /                                      │   │
│  │    → index.html (React SPA)                     │   │
│  │    → try_files $uri /index.html                 │   │
│  │                                                  │   │
│  │  location /api/                                 │   │
│  │    → proxy_pass backend:3000/api/              │   │
│  │    → REST API 프록시                            │   │
│  │                                                  │   │
│  │  location /socket.io/                           │   │
│  │    → WebSocket 프록시                           │   │
│  │    → Upgrade 헤더 처리                          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTP (내부 네트워크)
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              NestJS 컨테이너                             │
│  - Global Prefix: /api                                  │
│  - 포트: 3000 (내부 전용)                                │
│  - 세션 기반 인증 (PostgreSQL)                           │
│  - 엔드포인트:                                          │
│    • /api/auth/* (인증)                                 │
│    • /api/passport-photos/* (사진 관리)                 │
│    • /api/photo-edit (사진 편집)                        │
│    • /api/verification (사진 검증)                      │
│    • /socket.io/* (WebSocket)                           │
└─────────────────────────────────────────────────────────┘
```

### React SPA 라우팅

#### 빌드 결과물

```
apps/client/dist/
├── index.html              ← 단일 HTML 파일
├── assets/
│   ├── index-[hash].js    ← JavaScript 번들 (React Router 포함)
│   └── index-[hash].css   ← CSS 번들
└── 기타 정적 파일들
```

#### 라우팅 처리

1. **서버 사이드 (Nginx)**
   location / {
       root /usr/share/nginx/html;
       try_files $uri $uri/ /index.html;
   }
   - 모든 경로를 `index.html`로 반환
   - 실제 파일이 없으면 `index.html` 반환

2. **클라이언트 사이드 (React Router)**
   // 브라우저에서 실행
   const router = createBrowserRouter([
     { path: "/", element: <NewLandingPage /> },
     { path: "/album", element: <AlbumUploadPage /> },
     { path: "/webcam", element: <WebcamPage /> },
   ]);
   - URL 확인 후 해당 컴포넌트 렌더링
   - 페이지 새로고침 없이 라우팅

### WebSocket 별도 경로

#### 왜 별도 경로인가?

1. **프로토콜 차이**
   - HTTP: 요청-응답 모델
   - WebSocket: 양방향 통신, 연결 유지

2. **Upgrade 헤더 필요**
   location /socket.io/ {
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }

3. **경로 충돌 방지**
   - `/socket.io/`는 Socket.io의 표준 경로
   - React 라우트와 충돌 방지

4. **프록시 설정 차이**
   - WebSocket은 연결 유지 필요
   - 타임아웃 설정 다름

---

## 인증 시스템

### 인증 구조

#### 기본 원칙: 항상 인증 필요

**중요 변경 사항:**
- AUTH_ENABLED 환경 변수는 더 이상 사용되지 않습니다.
- 더미 사용자 기능은 제거되었습니다.
- 모든 엔드포인트는 기본적으로 인증이 필요합니다.
- @Public() 데코레이터가 있는 엔드포인트만 인증 없이 접근 가능합니다.

**인증 동작 방식:**
1. 모든 요청은 `passport.session()` 미들웨어를 통해 세션을 확인합니다.
2. `AuthenticatedGuard`가 모든 엔드포인트에 적용됩니다.
3. @Public() 데코레이터가 없는 모든 엔드포인트는 인증이 필요합니다.
4. 인증되지 않은 사용자는 `UnauthorizedException`이 발생합니다.

#### Public 엔드포인트

@Public() 데코레이터를 사용하여 인증 없이 접근 가능한 엔드포인트를 지정합니다:

```typescript
@Public()
@Get()
getHello() { ... }
```

#### 공개 엔드포인트 목록

1. **OAuth 인증**
   ```typescript
   @Controller('auth')
   export class AuthController {
     @Get('google')
     @Public()
     googleAuth() { ... }
     
     @Get('google/callback')
     @Public()
     googleAuthCallback() { ... }
     
     @Get('session/user')
     @Public()  // 로그인 상태 확인용
     getSessionUser() { ... }
   }
   ```

2. **Swagger 문서**
   - `/api` 경로는 Public으로 처리 (API 문서 확인용)

#### 인증 필요한 엔드포인트

**기본 원칙: 모든 엔드포인트는 인증이 필요합니다. @Public() 데코레이터가 없는 모든 엔드포인트는 인증이 필요합니다.**

```typescript
@Controller()
export class AppController {
  @Get()      // 인증 필요 (서버 상태 확인)
  getHello() { ... }
}

@Controller('passport-photos')
// @UseGuards(AuthenticatedGuard) - 전역 가드로 자동 적용
export class PassportPhotosController {
  @Get()      // 인증 필요
  @Post()     // 인증 필요
  @Patch()    // 인증 필요
  @Delete()   // 인증 필요
}
```

**중요 사항:**
- 더미 사용자 기능은 제거되었습니다. 모든 요청은 실제 OAuth 로그인이 필요합니다.
- AUTH_ENABLED 환경 변수는 더 이상 사용되지 않습니다. 항상 인증이 활성화되어 있습니다.

### 세션 설정

```typescript
// main.ts
app.use(session({
  store: sessionStore,  // PostgreSQL 세션 스토어
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid',
  cookie: {
    maxAge: 1800 * 1000,  // 30분 (기본값)
    httpOnly: true,          // XSS 방지
    secure: production,      // HTTPS 전용
    sameSite: 'lax',        // CSRF 방지 (서브 패스 최적화)
    path: '/',               // 모든 경로에서 사용
  },
}));
```

**세션 연장 (Rolling Session):**
- 사용자가 활동 중일 때 세션 만료 시간이 자동으로 연장됩니다.
- 모든 API 호출 시 `req.session.touch()`가 호출되어 세션 만료 시간이 갱신됩니다.
- 30분 동안 활동이 없으면 세션이 만료됩니다.

```typescript
// Rolling Session 미들웨어
app.use((req, res, next) => {
  // 세션이 있고 사용자가 인증된 경우에만 세션 갱신
  if (req.session && req.user) {
    req.session.touch();  // 세션 만료 시간 자동 갱신
  }
  next();
});
```

### CORS 설정

```typescript
// 서브 패스 방식: 같은 도메인
app.enableCors({
  origin: 'https://example.com',  // 단일 도메인
  credentials: true,              // 쿠키 전송
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### Admin 역할 자동 부여

**ADMIN_EMAILS 환경 변수 사용:**
- `.env` 파일에 `ADMIN_EMAILS` 환경 변수를 설정하면, 해당 이메일로 OAuth 로그인 시 자동으로 Admin 역할이 부여됩니다.
- 쉼표로 구분하여 여러 이메일을 지정할 수 있습니다.

```bash
# .env 파일
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

**동작 방식:**
1. 신규 사용자: `ADMIN_EMAILS`에 포함된 이메일로 로그인하면 처음부터 `ADMIN` 역할로 생성됩니다.
2. 기존 사용자: `ADMIN_EMAILS`에 포함된 이메일이지만 현재 `USER` 역할인 경우, 로그인 시 자동으로 `ADMIN` 역할로 업데이트됩니다.

**중요 사항:**
- Seed 기능은 제거되었습니다. Admin 역할은 OAuth 로그인 시 자동으로 부여됩니다.
- Seed 스크립트(`npm run seed`)는 더 이상 사용되지 않습니다.

---

## Nginx 설정

### 기본 설정 (로컬용 - HTTP)

```nginx
# nginx/nginx-local.conf
server {
    listen 80;
    server_name localhost;

    client_max_body_size 50M;

    # React 정적 파일
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        index index.html;
        
        # 캐싱 설정
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # REST API 프록시
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # WebSocket 프록시
    location /socket.io/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json application/xml image/svg+xml;
}
```

### 프로덕션 설정 (HTTPS)

```nginx
# nginx/nginx-production.conf

# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    server_name example.com www.example.com;
    
    # Let's Encrypt 인증서 발급을 위한 경로
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # HTTPS로 리다이렉트
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 서버
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL 인증서
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    
    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 50M;

    # React 정적 파일
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        index index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # REST API 프록시
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # WebSocket 프록시
    location /socket.io/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json application/xml image/svg+xml;
}
```

---

## HTTPS/SSL 설정

### SSL 인증서 옵션

#### 옵션 1: 자체 서명 인증서 (로컬 개발용)

```bash
# scripts/generate-ssl.sh
#!/bin/bash

SSL_DIR="./nginx/ssl"
DOMAIN="localhost"

mkdir -p "$SSL_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=AI-Pass/CN=$DOMAIN"
```

**특징:**
- 도메인 불필요
- 브라우저 경고 발생 (수동 승인 필요)
- 개발/테스트용으로 적합

#### 옵션 2: Let's Encrypt (프로덕션용)

```bash
# scripts/setup-ssl.sh
#!/bin/bash

DOMAIN=${DOMAIN:-example.com}
EMAIL=${SSL_EMAIL:-admin@${DOMAIN}}

docker run -it --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"
```

**특징:**
- 무료
- 자동 갱신 가능
- 브라우저 경고 없음
- 프로덕션에 적합

### Nginx SSL 종료

SSL 처리는 Nginx에서 수행하고, NestJS는 내부 네트워크에서 HTTP로 통신합니다.

```
[Client] → [Nginx:443 (HTTPS)] → [NestJS:3000 (HTTP 내부)]
```

**장점:**
- SSL 처리를 Nginx가 담당 (성능 최적화)
- NestJS는 HTTP만 처리 (단순화)
- 인증서 관리가 Nginx에 집중

---

## 배포 절차

### Phase 1: 로컬 환경 구성

#### 1. 디렉토리 구조 생성

```bash
mkdir -p nginx/ssl
mkdir -p scripts
mkdir -p certbot/conf
mkdir -p certbot/www
```

#### 2. 환경 변수 파일 생성

`.env` 파일 생성 (`.env.example`을 복사하여 사용):

```bash
# .env 파일을 프로젝트 루트에 생성
cp .env.example .env
```

`.env` 파일 예시:

```bash
# ============================================
# 로컬 배포 환경 변수 (localhost)
# ============================================

# 애플리케이션 환경
NODE_ENV=development

# 데이터베이스
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ai_pass
DATABASE_USER=ai_pass
DATABASE_PASSWORD=local_password_123

# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=ai-pass

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5173/api/auth/google/callback

# 세션 설정
SESSION_SECRET=your_session_secret_here
SESSION_MAX_AGE=1800  # 30분

# Admin 이메일 (쉼표로 구분)
ADMIN_EMAILS=admin@example.com,another-admin@example.com

# 프론트엔드 URL
FRONTEND_URL=http://localhost:5173

# 모델 서버
MODEL_SERVER_URL=http://localhost:5001

# 포트 설정 (Docker Compose용)
FORWARD_HTTP_PORT=80
FORWARD_HTTPS_PORT=443
```

#### 3. Nginx 설정 파일 생성

`nginx/nginx-local.conf` 파일 생성 (위의 Nginx 설정 참조)

#### 4. Docker Compose 수정

`docker-compose.yml`에 Nginx 서비스 추가:

```yaml
version: '3.9'

services:
  postgres:
    # ... 기존 설정

  mongodb:
    # ... 기존 설정

  frontend-builder:
    build:
      context: .
      dockerfile: apps/client/Dockerfile
    container_name: ai-pass-frontend-builder
    volumes:
      - frontend-build:/app/build
    environment:
      VITE_BASE_URL: ${VITE_BASE_URL:-/api}
    command: sh -c "npm run build && cp -r dist/* /app/build/"

  backend:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    container_name: ai-pass-backend
    networks:
      - ai-pass-prod
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${DATABASE_NAME:-ai_pass}
      DATABASE_USER: ${DATABASE_USER:-ai_pass}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
      MONGO_HOST: mongodb
      MONGO_PORT: 27017
      MONGO_DATABASE: ${MONGO_DATABASE:-ai-pass}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_CALLBACK_URL: ${GOOGLE_CALLBACK_URL}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost}
      MODEL_SERVER_URL: ${MODEL_SERVER_URL:-http://host.docker.internal:5001}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    expose:
      - 3000

  nginx:
    image: nginx:alpine
    container_name: ai-pass-nginx
    restart: unless-stopped
    networks:
      - ai-pass-prod
    depends_on:
      - backend
      - frontend-builder
    volumes:
      - ./nginx/nginx-local.conf:/etc/nginx/conf.d/default.conf:ro
      - frontend-build:/usr/share/nginx/html:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "${FORWARD_HTTP_PORT:-80}:80"
      - "${FORWARD_HTTPS_PORT:-443}:443"
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  ai-pass-prod:
    name: ai-pass-prod-network
    driver: bridge

volumes:
  postgres_data:
    name: ai-pass-postgres-prod
  mongodb_data:
    name: ai-pass-mongodb-prod
  frontend-build:
    name: ai-pass-frontend-build
```

#### 5. NestJS 수정

`apps/server/src/main.ts`:

```typescript
// Global Prefix 설정
app.setGlobalPrefix('api');

// 포트 변경
await app.listen(3000, "0.0.0.0", () => {
  console.log('🚀 Server is running on port 3000 (internal)');
});
```

#### 6. React Dockerfile 수정

`apps/client/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
COPY apps/client/package.json apps/client/package.json
COPY packages packages

RUN npm install

COPY apps/client apps/client

WORKDIR /usr/src/app/apps/client

RUN npm run build

FROM alpine:latest

WORKDIR /app

COPY --from=builder /usr/src/app/apps/client/dist ./build

CMD ["sh", "-c", "while true; do sleep 3600; done"]
```

#### 7. 배포 스크립트 생성

`scripts/deploy-local.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 AI-Pass 로컬 배포 시작..."

if [ ! -f ".env.local" ]; then
  echo "❌ .env.local 파일이 없습니다."
  exit 1
fi

export $(cat .env.local | grep -v '^#' | xargs)

if [ -z "$DATABASE_PASSWORD" ]; then
  echo "❌ DATABASE_PASSWORD가 설정되지 않았습니다."
  exit 1
fi

echo "📋 배포 설정:"
echo "   - 도메인: ${DOMAIN:-localhost}"
echo "   - HTTP 포트: ${FORWARD_HTTP_PORT:-80}"
echo ""

docker-compose down
docker-compose build
docker-compose up -d

sleep 15

docker-compose ps

echo ""
echo "✅ 배포 완료!"
echo "🌐 접속 URL: http://${DOMAIN:-localhost}"
```

### Phase 2: 프로덕션 배포 (도메인 적용)

#### 1. 환경 변수 파일 수정

`.env` 파일을 프로덕션 환경에 맞게 수정:

```bash
# .env 파일 수정
NODE_ENV=production

# 데이터베이스 (Docker 서비스 이름 사용)
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=ai_pass
DATABASE_USER=ai_pass
DATABASE_PASSWORD=your_production_password

# MongoDB (Docker 서비스 이름 사용)
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_DATABASE=ai-pass

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# 세션 설정
SESSION_SECRET=your_strong_session_secret_here
SESSION_MAX_AGE=1800  # 30분

# Admin 이메일
ADMIN_EMAILS=admin@yourdomain.com

# 프론트엔드 URL
FRONTEND_URL=https://yourdomain.com

# 모델 서버 (Docker 내부)
MODEL_SERVER_URL=http://host.docker.internal:5001
```

**중요 사항:**
- `.env` 파일 하나만 사용합니다. 환경별 파일(.env.local, .env.production 등)은 사용하지 않습니다.
- 개발/프로덕션 환경 구분은 `NODE_ENV` 환경 변수로 처리합니다.
- `npm run dev`: `NODE_ENV=development` (기본값)
- `npm run prod`: `NODE_ENV=production`

#### 2. Nginx 설정 변경

`docker-compose.yml`에서:

```yaml
nginx:
  volumes:
    - ./nginx/nginx-production.conf:/etc/nginx/conf.d/default.conf:ro
```

#### 3. SSL 인증서 발급

```bash
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

#### 4. 배포 실행

```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

---

## 문제 해결

### 경로 충돌

**문제**: React 라우트와 백엔드 API 경로 충돌

**해결책**:
1. React 라우트에서 `/api` 사용 금지
2. 백엔드 API는 항상 `/api`로 시작
3. Nginx에서 우선순위 설정

### 정적 파일과 API 경로 충돌

**문제**: 정적 파일과 API 경로 구분

**해결책**:
```nginx
# 정적 파일을 먼저 처리
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    root /usr/share/nginx/html;
}

# 그 다음 API
location /api/ {
    proxy_pass http://backend:3000/api/;
}
```

### WebSocket 연결 실패

**문제**: WebSocket 연결이 안 됨

**해결책**:
1. Nginx에서 Upgrade 헤더 확인
2. `proxy_set_header Upgrade $http_upgrade;` 설정 확인
3. `proxy_set_header Connection "upgrade";` 설정 확인

### 세션 쿠키 전송 안 됨

**문제**: 세션 쿠키가 전송되지 않음

**해결책**:
1. `withCredentials: true` 설정 확인 (프론트엔드)
2. CORS `credentials: true` 설정 확인 (백엔드)
3. 쿠키 `path: '/'` 설정 확인
4. `sameSite: 'lax'` 설정 확인 (서브 패스 방식)

---

## 참고 자료

### 관련 문서

- [환경 변수 관리 가이드](./ENV_VARIABLES.md)
- [OAuth 구조 최적화](./OAUTH_STRUCTURE_OPTIMIZATION.md)
- [RESTful API 테스트 가이드](./RESTFUL_API_TEST_GUIDE.md)

### 외부 자료

- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [NestJS 배포 가이드](https://docs.nestjs.com/recipes/deployment)
- [Socket.io 문서](https://socket.io/docs/v4/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)

---

## 체크리스트

### Phase 1: 로컬 환경 구성

- [ ] 디렉토리 생성 (`nginx/ssl`, `scripts`)
- [ ] `.env` 파일 생성 및 설정 (`.env.example` 복사)
- [ ] `nginx/nginx-local.conf` 생성
- [ ] `docker-compose.yml` 수정 (Nginx 추가)
- [ ] `apps/server/src/main.ts` 수정 (Global Prefix, 포트 변경)
- [ ] `apps/client/Dockerfile` 수정
- [ ] `scripts/deploy-local.sh` 생성 및 실행 권한 부여
- [ ] 배포 실행 및 테스트

### Phase 2: 프로덕션 배포

- [ ] `.env` 파일 수정 (프로덕션 환경 변수로 변경)
- [ ] `NODE_ENV=production` 설정 확인
- [ ] Google OAuth 콜백 URL 도메인으로 변경
- [ ] `ADMIN_EMAILS` 환경 변수 설정
- [ ] `nginx/nginx-production.conf` 생성
- [ ] `docker-compose.yml`에서 Nginx 설정 파일 변경
- [ ] `scripts/setup-ssl.sh` 생성 및 실행 권한 부여
- [ ] SSL 인증서 발급
- [ ] `scripts/deploy-production.sh` 생성 및 실행 권한 부여
- [ ] 배포 실행 및 테스트

---

## 요약

### 핵심 결정 사항

1. **배포 구조**: Nginx 리버스 프록시 + 서브 패스 방식
2. **인증 시스템**: 세션 기반 인증 (PostgreSQL 세션 스토어)
3. **API 구조**: Global Prefix `/api` 사용
4. **WebSocket**: 별도 경로 `/socket.io/` 사용
5. **HTTPS**: Nginx SSL 종료 방식
6. **세션 만료**: 30분 (Rolling Session으로 자동 연장)
7. **Admin 역할**: ADMIN_EMAILS 환경 변수로 자동 부여

### 장점

1. **구현 단순**: 세션 기반 인증으로 OAuth, WebSocket 자동 통합
2. **보안 강화**: httpOnly 쿠키, 즉시 무효화 가능, 더미 사용자 제거
3. **비용 효율**: 단일 SSL 인증서, 단일 도메인 관리
4. **확장성**: Global Prefix로 버전 관리 용이
5. **표준 준수**: RESTful 원칙 준수, 업계 표준 패턴
6. **환경 변수 단순화**: .env 파일 하나만 사용, 환경별 파일 불필요

### 주요 변경 사항

1. **AUTH_ENABLED 제거**: 항상 인증이 활성화되어 있습니다.
2. **더미 사용자 제거**: 보안을 위해 더미 사용자 기능을 완전히 제거했습니다.
3. **Seed 기능 제거**: Admin 역할은 OAuth 로그인 시 ADMIN_EMAILS 환경 변수로 자동 부여됩니다.
4. **세션 만료시간 변경**: 7일에서 30분으로 변경 (Rolling Session으로 자동 연장).
5. **환경 변수 단순화**: .env 파일 하나만 사용하며, NODE_ENV로 개발/프로덕션 구분.

이 구조는 현재 시스템 요구사항에 최적화되어 있으며, 향후 확장에도 유연하게 대응할 수 있습니다.

