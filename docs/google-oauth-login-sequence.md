# Google OAuth 로그인 플로우 Sequence Diagram

## 전체 플로우 개요

```mermaid
sequenceDiagram
    participant User as 사용자
    participant Browser as 브라우저
    participant React as React App
    participant NestJS as NestJS Server
    participant GoogleStrategy as GoogleStrategy
    participant AuthService as AuthService
    participant SessionSerializer as SessionSerializer
    participant DB as PostgreSQL
    participant Google as Google OAuth

    Note over User,Google: Step 1: 로그인 시작

    User->>Browser: "Google로 로그인" 버튼 클릭
    Browser->>React: 클릭 이벤트 처리
    React->>Browser: window.location.href = '/auth/google'
    Browser->>NestJS: GET /auth/google

    Note over NestJS,GoogleStrategy: Step 2: Google OAuth 인증 요청

    NestJS->>GoogleStrategy: AuthGuard('google') 실행
    GoogleStrategy->>Google: OAuth 인증 요청<br/>(client_id, redirect_uri, scope)
    Google->>User: 302 Redirect<br/>(Google 로그인 페이지)

    Note over User,Google: Step 3: Google 인증

    User->>Google: 계정 선택 + 권한 승인
    Google->>NestJS: 302 Redirect<br/>GET /auth/google/callback?code=abc123

    Note over NestJS,Google: Step 4: Access Token 교환

    NestJS->>GoogleStrategy: AuthGuard('google') 실행<br/>(callback 처리)
    GoogleStrategy->>Google: POST /token<br/>{code, client_secret}
    Google->>GoogleStrategy: Access Token (ya29.a0...)

    Note over GoogleStrategy,Google: Step 5: 사용자 정보 조회

    GoogleStrategy->>Google: GET /userinfo<br/>Authorization: Bearer token
    Google->>GoogleStrategy: {id, email, name, picture}

    Note over GoogleStrategy: Google Token 폐기!

    Note over GoogleStrategy,DB: Step 6: 사용자 찾기 또는 생성

    GoogleStrategy->>GoogleStrategy: validate() 실행<br/>userInfo 객체 생성
    GoogleStrategy->>AuthService: findOrCreateUser(userInfo)

    Note over AuthService,DB: 트랜잭션 시작

    AuthService->>DB: BEGIN TRANSACTION
    AuthService->>DB: SELECT * FROM oauth_accounts<br/>WHERE provider='google'<br/>AND provider_user_id='123456789'

    alt 기존 OAuth 계정 있음
        DB->>AuthService: Found! {user_id: 999}
        AuthService->>DB: SELECT * FROM users<br/>WHERE id=999
        DB->>AuthService: User 객체
        AuthService->>DB: COMMIT
        AuthService->>GoogleStrategy: 기존 User 반환
    else 신규 사용자
        DB->>AuthService: Not Found
        AuthService->>DB: INSERT INTO users<br/>(email, username, ...)<br/>RETURNING id
        DB->>AuthService: user_id: 999
        AuthService->>DB: INSERT INTO oauth_accounts<br/>(user_id, provider, ...)
        DB->>AuthService: OAuthAccount 생성 완료
        AuthService->>DB: COMMIT
        AuthService->>GoogleStrategy: 신규 User 반환
    end

    Note over GoogleStrategy,SessionSerializer: Step 7: 세션 생성 (준비)

    GoogleStrategy->>GoogleStrategy: done(null, user)
    GoogleStrategy->>SessionSerializer: serializeUser(user)
    SessionSerializer->>SessionSerializer: user.id 추출 (999)
    Note over SessionSerializer: 세션에 user.id 저장<br/>(3단계에서 express-session 설정 예정)

    Note over NestJS,User: Step 8: 응답

    NestJS->>Browser: 200 OK<br/>{message, user}
    Browser->>User: 로그인 완료 화면 표시

    Note over User,DB: Step 9: 이후 API 요청 (3단계에서 완성)

    User->>Browser: API 요청 (예: GET /api/passport/photos)
    Browser->>NestJS: GET /api/passport/photos<br/>Cookie: connect.sid=abc123

    Note over NestJS,DB: 세션 검증 (3단계에서 구현)

    NestJS->>DB: SELECT * FROM sessions<br/>WHERE sid='abc123'<br/>AND expire > NOW()
    DB->>NestJS: {sess: {"passport":{"user":999}}}
    NestJS->>SessionSerializer: deserializeUser(999)
    SessionSerializer->>DB: SELECT * FROM users<br/>WHERE id=999
    DB->>SessionSerializer: User 객체
    SessionSerializer->>NestJS: req.user = User 객체
    NestJS->>NestJS: AuthenticatedGuard 통과
    NestJS->>Browser: 200 OK + 데이터
```

## 상세 플로우: 신규 사용자 로그인

```mermaid
sequenceDiagram
    participant User as 사용자
    participant NestJS as NestJS
    participant GoogleStrategy as GoogleStrategy
    participant AuthService as AuthService
    participant DB as PostgreSQL

    Note over User,DB: 신규 사용자 첫 로그인 시나리오

    User->>NestJS: GET /auth/google
    NestJS->>GoogleStrategy: OAuth 인증 요청
    GoogleStrategy->>User: Google 로그인 페이지

    User->>GoogleStrategy: 인증 완료 (code=abc123)
    GoogleStrategy->>GoogleStrategy: Access Token 교환
    GoogleStrategy->>GoogleStrategy: 사용자 정보 조회<br/>{id: "123456789", email: "newuser@gmail.com"}

    GoogleStrategy->>GoogleStrategy: validate() 실행<br/>userInfo 생성
    GoogleStrategy->>AuthService: findOrCreateUser(userInfo)

    Note over AuthService,DB: 트랜잭션 시작

    AuthService->>DB: BEGIN TRANSACTION

    AuthService->>DB: SELECT * FROM oauth_accounts<br/>WHERE provider='google'<br/>AND provider_user_id='123456789'
    DB->>AuthService: Not Found (신규 사용자)

    AuthService->>DB: INSERT INTO users<br/>(email, username, profile_picture, role)<br/>VALUES ('newuser@gmail.com', '홍길동', ...)<br/>RETURNING id
    DB->>AuthService: user_id: 1

    AuthService->>DB: INSERT INTO oauth_accounts<br/>(user_id, provider, provider_user_id, profile_metadata)<br/>VALUES (1, 'google', '123456789', {...})
    DB->>AuthService: OAuthAccount 생성 완료

    AuthService->>DB: COMMIT

    AuthService->>GoogleStrategy: User 객체 반환 (id: 1)
    GoogleStrategy->>GoogleStrategy: done(null, user)
    GoogleStrategy->>NestJS: req.user = User 객체
    NestJS->>User: 로그인 완료
```

## 상세 플로우: 기존 사용자 재로그인

```mermaid
sequenceDiagram
    participant User as 사용자
    participant NestJS as NestJS
    participant GoogleStrategy as GoogleStrategy
    participant AuthService as AuthService
    participant DB as PostgreSQL

    Note over User,DB: 기존 사용자 재로그인 시나리오

    User->>NestJS: GET /auth/google
    NestJS->>GoogleStrategy: OAuth 인증 요청
    GoogleStrategy->>User: Google 로그인 페이지

    User->>GoogleStrategy: 인증 완료 (code=abc123)
    GoogleStrategy->>GoogleStrategy: Access Token 교환
    GoogleStrategy->>GoogleStrategy: 사용자 정보 조회<br/>{id: "123456789", email: "user@gmail.com"}

    GoogleStrategy->>GoogleStrategy: validate() 실행<br/>userInfo 생성
    GoogleStrategy->>AuthService: findOrCreateUser(userInfo)

    Note over AuthService,DB: 트랜잭션 시작

    AuthService->>DB: BEGIN TRANSACTION

    AuthService->>DB: SELECT * FROM oauth_accounts<br/>WHERE provider='google'<br/>AND provider_user_id='123456789'<br/>JOIN users
    DB->>AuthService: Found!<br/>{user_id: 999, user: {...}}

    Note over AuthService: 기존 User 반환<br/>(신규 생성 불필요)

    AuthService->>DB: COMMIT

    AuthService->>GoogleStrategy: 기존 User 객체 반환 (id: 999)
    GoogleStrategy->>GoogleStrategy: done(null, user)
    GoogleStrategy->>NestJS: req.user = User 객체
    NestJS->>User: 로그인 완료
```

## 데이터베이스 트랜잭션 상세

```mermaid
sequenceDiagram
    participant AuthService as AuthService
    participant DB as PostgreSQL

    Note over AuthService,DB: 트랜잭션 처리 과정

    AuthService->>DB: BEGIN TRANSACTION

    rect rgb(240, 248, 255)
        Note over AuthService,DB: 1단계: 기존 OAuth 계정 조회
        AuthService->>DB: SELECT * FROM oauth_accounts<br/>WHERE provider='google'<br/>AND provider_user_id='123456789'<br/>JOIN users
        DB->>AuthService: 결과 반환
    end

    alt 기존 계정 있음
        AuthService->>AuthService: existingOAuthAccount.user 반환
        AuthService->>DB: COMMIT
    else 신규 사용자
        rect rgb(240, 255, 240)
            Note over AuthService,DB: 2단계: 신규 User 생성
            AuthService->>DB: INSERT INTO users<br/>(email, username, profile_picture, role)<br/>RETURNING id
            DB->>AuthService: user_id: 999
        end

        rect rgb(255, 248, 240)
            Note over AuthService,DB: 3단계: OAuth 계정 생성
            AuthService->>DB: INSERT INTO oauth_accounts<br/>(user_id, provider, provider_user_id, profile_metadata)
            DB->>AuthService: OAuthAccount 생성 완료
        end

        AuthService->>DB: COMMIT
        AuthService->>AuthService: savedUser 반환
    end

    Note over AuthService,DB: 트랜잭션 완료<br/>(에러 시 ROLLBACK)
```

## 주요 포인트

### 1. 완전 분리 방식
- `provider` + `provider_user_id`만으로 식별
- 이메일 기반 통합 로직 없음
- 같은 사람이라도 다른 OAuth 제공자로 로그인하면 별도 User 생성

### 2. 트랜잭션 보장
- `BEGIN TRANSACTION`으로 시작
- User 생성 실패 시 OAuthAccount 생성도 롤백
- 데이터 일관성 보장

### 3. 세션 준비
- `SessionSerializer.serializeUser()`로 `user.id`만 저장 준비
- 3단계에서 `express-session` 설정 후 실제 세션 생성

### 4. Google Token 처리
- Access Token은 사용 후 즉시 폐기
- 우리 서버에서는 세션만 사용

