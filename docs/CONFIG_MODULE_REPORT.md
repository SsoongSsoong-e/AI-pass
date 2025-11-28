# 환경변수 관리 - Factory Design Pattern 적용

> 요약:
> 
> 환경변수 관리를 Factory Pattern으로 중앙화하고, docker-compose와 통합하여 환경별 설정을 자동화했습니다. 2계층 구조(Schema, Config)로 타입 안전성과 런타임 검증을 확보하고, 개발/프로덕션 환경에 따라 다른 기본값을 자동 적용하도록 개선했습니다.

---

## 개선 1: Factory Pattern 기반 환경변수 중앙화

### 문제: 환경변수 관리의 분산 및 중복

기존에는 각 모듈에서 환경변수를 직접 참조:

- `main.ts`: `process.env.NODE_ENV`, `process.env.FRONTEND_URL` 등 직접 참조
- `app.module.ts`: TypeORM, Mongoose 설정에서 `process.env` 직접 사용
- 각 서비스: `ConfigService.get()` 호출이 분산되어 있음

**문제점:**
- 환경변수 접근 로직이 여러 곳에 분산되어 있음
- 환경별 기본값 로직 중복 (개발: localhost, 프로덕션: Docker 서비스 이름)
- 새로운 환경변수 추가 시 여러 파일 수정 필요
- 타입 안전성 부족

### 해결: Configuration Factory Pattern 도입

**변경 전:**
```typescript
// 여러 파일에 분산
// main.ts
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// app.module.ts
const dbHost = process.env.DATABASE_HOST || 'localhost';
const isProduction = process.env.NODE_ENV === 'production';
const dbHost = isProduction ? 'postgres' : 'localhost';
```

**변경 후:**
```typescript
// env.config.ts - Factory 함수로 중앙화
export default registerAs('app', () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  return {
    DATABASE_HOST: process.env.DATABASE_HOST || 
      (isProduction ? 'postgres' : 'localhost'),
    // ... 모든 환경변수 설정
  };
});

// 사용하는 곳에서는
const dbHost = configService.get<string>('DATABASE_HOST');
```

**개선 효과:**
- 환경변수 관리 로직 중앙화로 유지보수성 향상
- 환경별 기본값 로직 일원화
- 새로운 환경변수 추가 시 한 곳만 수정
- `ConfigService.get('app')`로 일관된 접근 방식 확립

---

## 개선 2: 2계층 구조 설계

### 문제: 타입 안전성 및 검증 로직 부재

기존에는 환경변수 타입 정의와 검증이 없음:
- 환경변수 이름 오타 시 런타임 에러 발생
- 필수 환경변수 누락 시 늦은 발견
- 타입 체크 불가

### 해결: Schema-Config 2계층 구조

**1단계: Schema 계층 (env.schema.ts)**
```typescript
// 타입 정의
export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production';
  DATABASE_HOST: string;
  // ...
}

// 필수 환경변수 목록
export const REQUIRED_ENV_VARS: (keyof EnvironmentVariables)[] = [
  'NODE_ENV',
  'DATABASE_HOST',
  // ...
];

// 검증 함수
export function validateEnvVariables(config: Partial<EnvironmentVariables>) {
  // 필수 환경변수 누락 검증
}
```

**2단계: Config 계층 (env.config.ts)**
```typescript
// Factory 함수로 설정 객체 생성
export default registerAs('app', () => {
  const config: Partial<EnvironmentVariables> = {
    // 환경별 기본값 적용
  };
  return config;
});
```

**개선 효과:**
- 컴파일 타임 타입 안전성 확보
- 런타임 검증으로 필수 환경변수 누락 조기 발견
- 계층 분리로 유지보수성 향상

---

## 개선 3: docker-compose와의 통합

### 문제: 환경별 설정 수동 관리

기존에는 환경별 설정을 수동으로 관리:
- 개발/프로덕션 환경 전환 시 코드 수정 필요
- docker-compose 설정과 코드 설정 불일치 가능

### 해결: docker-compose 환경변수 주입과 Factory Pattern 통합

**docker-compose.dev.yml:**
```yaml
environment:
  NODE_ENV: development  # ← 컨테이너에 주입
  DATABASE_HOST: postgres
```

**docker-compose.yml:**
```yaml
environment:
  NODE_ENV: production  # ← 컨테이너에 주입
  DATABASE_HOST: postgres
```

**env.config.ts:**
```typescript
export default registerAs('app', () => {
  // docker-compose가 주입한 NODE_ENV 사용
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // 환경에 따라 다른 기본값 적용
  DATABASE_HOST: process.env.DATABASE_HOST || 
    (isProduction ? 'postgres' : 'localhost'),
});
```

**동작 흐름:**
```
npm run dev:full
  ↓
docker-compose.dev.yml 실행
  ↓
NODE_ENV: development 주입
  ↓
Factory 함수가 환경 감지
  ↓
개발 환경 기본값 적용 (localhost)
```

**개선 효과:**
- 환경 전환 시 코드 변경 불필요
- docker-compose 설정과 코드 설정 일관성 유지
- 환경별 기본값 자동 적용

---

## 개선 4: 불필요한 코드 제거

### 문제: 사용하지 않는 Helper 함수

기존에는 `env.helpers.ts` 파일에 `resolveEnvPaths` 함수가 있었지만:
- 단순히 `.env` 파일 경로만 반환하는 래퍼 함수
- docker-compose가 환경변수를 주입하므로 환경별 파일 로드 불필요
- 한 곳에서만 사용되어 재사용성 낮음

### 해결: Helper 함수 제거 및 직접 사용

**변경 전:**
```typescript
// env.helpers.ts
export function resolveEnvPaths(baseDir: string): string[] {
  return [join(baseDir, '.env')];
}

// app.module.ts
import { resolveEnvPaths } from './config/env.helpers';
envFilePath: resolveEnvPaths(process.cwd())
```

**변경 후:**
```typescript
// app.module.ts
envFilePath: ['.env']  // 직접 사용
```

**개선 효과:**
- 불필요한 파일 제거 (env.helpers.ts 삭제)
- 코드 간결화
- 기능 동일하게 유지

---

## 개선 5: 런타임 검증 및 에러 처리

### 문제: 필수 환경변수 누락 시 늦은 발견

기존에는 환경변수 누락을 런타임에 발견:
- 애플리케이션 실행 중 오류 발생
- 문제 원인 파악 어려움

### 해결: 애플리케이션 시작 시 자동 검증

**app.module.ts:**
```typescript
export class AppModule implements OnModuleInit {
  onModuleInit() {
    const config = this.configService.get('app');
    const validation = validateEnvVariables(config || {});
    
    if (!validation.isValid) {
      // 누락된 환경변수 목록 출력
      // 환경별 해결 방법 제시
      if (isProduction) {
        throw new Error('필수 환경변수 누락');
      } else {
        console.warn('경고 메시지');
      }
    }
  }
}
```

**검증 결과 예시:**
```
❌ 필수 환경 변수가 설정되지 않았습니다:
   - GOOGLE_CLIENT_ID
   - SESSION_SECRET

💡 해결 방법:
   개발 환경:
   1. 프로젝트 루트에 .env 파일 생성
   2. cp .env.example .env 명령어로 복사
   3. .env 파일에 필수 환경 변수 값 입력
```

**개선 효과:**
- 애플리케이션 시작 시 즉시 검증
- 명확한 에러 메시지와 해결 방법 제시
- 프로덕션에서는 누락 시 시작 실패로 안전성 확보

---

## Before & After 비교

### 환경변수 접근 방식 비교

| 항목 | Before | After | 개선점 |
| --- | --- | --- | --- |
| 환경변수 접근 | `process.env.*` 직접 사용 | `ConfigService.get('app.*')` | 중앙화된 접근 |
| 타입 안전성 | 없음 | TypeScript 인터페이스 | 컴파일 타임 검증 |
| 환경별 기본값 | 각 모듈에서 중복 처리 | Factory 함수에서 일원화 | 중복 제거 |
| 검증 | 없음 | 런타임 검증 | 조기 오류 발견 |
| docker-compose 통합 | 수동 관리 | 자동 통합 | 환경 전환 자동화 |
| Helper 함수 | 불필요한 래퍼 함수 | 제거 | 코드 간결화 |

### 코드 구조 비교

**Before:**
```typescript
// 여러 파일에 분산
// main.ts
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// app.module.ts
const dbHost = process.env.DATABASE_HOST || 'localhost';

// env.helpers.ts (불필요)
export function resolveEnvPaths(baseDir: string): string[] {
  return [join(baseDir, '.env')];
}
```

**After:**
```typescript
// env.config.ts - 한 곳에서 관리
export default registerAs('app', () => {
  return {
    FRONTEND_URL: process.env.FRONTEND_URL || '...',
    DATABASE_HOST: process.env.DATABASE_HOST || '...',
  };
});

// app.module.ts
envFilePath: ['.env']  // 직접 사용

// 사용하는 곳
const frontendUrl = configService.get<string>('FRONTEND_URL');
```

---

## 배운 점

### Factory Pattern의 효과

**발견:**
- 환경변수 관리 로직을 Factory 함수로 캡슐화
- 환경별 다른 설정 객체 생성 가능
- `registerAs`로 네임스페이스 관리

**교훈:**
- 객체 생성 로직을 중앙화하면 유지보수성 향상
- Factory Pattern은 설정 관리에 적합
- NestJS의 `registerAs`는 설정 팩토리 구현에 유용

### docker-compose 통합의 중요성

**발견:**
- docker-compose가 환경변수를 주입하면 코드 수정 없이 환경 전환 가능
- Factory 함수는 주입된 값을 읽어 환경별 설정 생성
- Helper 함수로 환경별 파일을 찾을 필요 없음

**교훈:**
- 인프라 설정과 코드 설정의 분리
- 환경변수 주입을 통한 환경별 동작 제어
- Factory Pattern은 외부 설정과 잘 통합됨

### 불필요한 추상화 제거

**발견:**
- 단순 래퍼 함수는 오히려 복잡도만 증가
- docker-compose 주입 시 환경별 파일 로드 불필요
- 직접 사용이 더 간결하고 명확함

**교훈:**
- YAGNI 원칙 (You Aren't Gonna Need It)
- 실제 필요할 때까지 추상화하지 않기
- 간결함이 가독성을 높임

### 타입 안전성의 가치

**발견:**
- TypeScript 인터페이스로 환경변수 타입 정의
- 컴파일 타임에 오타 및 타입 오류 발견
- 런타임 검증으로 필수 환경변수 누락 방지

**교훈:**
- 타입 정의가 문서 역할도 수행
- 컴파일 타임과 런타임 검증의 조합
- 스키마 기반 접근으로 일관성 확보

---

## 개선 효과

- **코드 중복**: 각 모듈에서 환경변수 처리 → Factory 함수로 중앙화 (중복 제거)
- **타입 안전성**: 없음 → TypeScript 인터페이스 + 런타임 검증 (오류 조기 발견)
- **환경 전환**: 수동 코드 수정 → docker-compose 주입으로 자동화 (환경 전환 자동화)
- **유지보수성**: 여러 파일 수정 → 한 곳에서 관리 (유지보수성 향상)
- **코드 간결성**: 불필요한 Helper 함수 제거 (코드 간결화)
- **개발자 경험**: 명확한 에러 메시지와 해결 방법 제시 (온보딩 시간 단축)

