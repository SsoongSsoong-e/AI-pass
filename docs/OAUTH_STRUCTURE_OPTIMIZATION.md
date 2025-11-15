# OAuth 구조 최적화 보고서

## 1. 변경해야 하는 이유

### 1.1 현재 구조의 문제점

현재 시스템은 다음과 같은 구조로 설계되어 있습니다:

- **User 테이블**: 사용자 기본 정보 저장
- **OAuthAccount 테이블**: OAuth 제공자 정보 저장
- **TypeORM 관계 정의**: Many-to-One / One-to-Many (잘못된 정의)
  - TypeORM에서는 `@ManyToOne`과 `@OneToMany` 관계로 정의됨
  - 하지만 실제 비즈니스 로직과는 다름

**실제 비즈니스 로직:**
- OAuth 계정 하나당 항상 새로운 User 생성
- 같은 User가 여러 OAuth 제공자와 연결되는 경우 없음
- **실제로는 One-to-One 관계로 동작**

**이메일 생성 로직의 문제:**
- 기존: `google_user@gmail.com` 형식으로 provider prefix 추가
- 문제: 다른 OAuth 제공자는 이미 서로 다른 도메인을 사용함
  - Google OAuth: `user@gmail.com`
  - Kakao OAuth: `user@kakao.com`
  - 도메인이 이미 다르므로 prefix가 불필요

**문제점:**
1. **관계 정의 오류**: Many-to-One/One-to-Many로 정의했지만 실제로는 One-to-One
2. **이메일 생성 로직 오류**: provider prefix가 불필요함
3. **코드 주석과 실제 동작 불일치**: 혼란 가능성

### 1.2 변경이 필요한 이유

1. **관계 정의 오류**
   - TypeORM 관계 정의가 실제 동작과 다름
   - One-to-One 관계로 명확히 정의해야 함

2. **이메일 생성 로직 오류**
   - provider prefix가 불필요함
   - 다른 OAuth 제공자는 이미 다른 도메인을 사용하므로 자동으로 구분됨

3. **명확성 부족**
   - 현재 비즈니스 로직이 명확히 문서화되지 않음
   - 새로운 개발자가 빠르게 이해하기 어려움

### 1.3 선택한 해결 방안: 옵션 3 (One-to-One으로 변경)

현재 구조를 유지하되, 관계를 One-to-One으로 변경하고 이메일 생성 로직을 수정:
- 실제 동작 방식을 정확히 반영
- 이메일 생성 로직 수정 (provider prefix 제거)
- One-to-One 관계로 명확히 정의

## 2. 옵션 3의 장단점

### 2.1 장점

#### ✅ 관계 정의의 정확성
- One-to-One 관계로 명확히 정의
- 구조와 실제 동작이 일치
- 코드 가독성 향상

#### ✅ 이메일 생성 로직 개선
- provider prefix 제거로 로직 단순화
- 원본 이메일 그대로 사용
- 각 OAuth 제공자의 도메인이 다르므로 자동으로 구분됨

#### ✅ Foreign Key로 데이터 무결성 보장
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```
- User 삭제 시 OAuthAccount 자동 삭제
- 잘못된 user_id 저장 방지
- 데이터베이스 레벨에서 참조 무결성 보장

#### ✅ JOIN으로 User 정보 조회 용이
```typescript
const oauthAccount = await manager.findOne(OAuthAccount, {
  where: { provider: 'google', provider_user_id: '123' },
  relations: ['user'], // JOIN으로 User 정보 함께 조회
});
```
- TypeORM의 `relations` 기능 활용
- 한 번의 쿼리로 관련 데이터 조회

#### ✅ OAuthAccount.id의 명확한 역할
- 각 OAuthAccount를 고유하게 식별
- 다른 테이블에서 참조 가능
- 로그/감사 추적 용이
- TypeORM 요구사항 충족

### 2.2 단점

#### ⚠️ 테이블 분리로 인한 복잡도
- 두 테이블 관리 필요
- JOIN 필요 (하지만 relations로 해결)
- 단일 테이블보다 복잡

#### ⚠️ 코드 복잡도
- 두 엔티티 관리 필요
- 트랜잭션에서 두 테이블 처리
- 하지만 현재 코드가 이미 잘 작동 중

### 2.3 비교표

| 항목 | 옵션 1 (통합) | 옵션 3 (One-to-One) |
|------|--------------|-------------------|
| 테이블 수 | 1개 | 2개 |
| JOIN 필요 | ❌ | ✅ (relations 사용) |
| Foreign Key | ❌ | ✅ |
| 코드 변경 | 많음 | 중간 |
| 마이그레이션 | 필요 | 필요 (관계 변경) |
| 확장성 | 낮음 | 높음 |
| 데이터 무결성 | 애플리케이션 레벨 | DB 레벨 |
| 관계 정의 정확성 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 성능 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 유지보수성 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 3. 변경한 내용

### 3.1 이메일 생성 로직 수정 (`auth.service.ts`)

**변경 전:**
```typescript
// provider prefix 추가
const emailParts = userInfo.email.split('@');
return `${userInfo.provider}_${emailParts[0]}@${emailParts[1]}`;
// 예: user@gmail.com -> google_user@gmail.com
```

**변경 후:**
```typescript
// 원본 이메일 그대로 사용
// 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 자동으로 구분됨
if (userInfo.email) {
  return userInfo.email;  // 원본 이메일 그대로
}
// 예: Google -> user@gmail.com, Kakao -> user@kakao.com
```

**이유:**
- Google OAuth: `user@gmail.com`
- Kakao OAuth: `user@kakao.com`
- 도메인이 이미 다르므로 prefix 불필요

### 3.2 OAuthAccount 엔티티 (`oauth-account.entity.ts`)

**변경 내용:**
- `@ManyToOne` → `@OneToOne`로 변경
- 주석 업데이트: One-to-One 관계 명시
- 이메일 생성 로직 변경 반영

**주요 변경사항:**
```typescript
/**
 * OAuthAccount Entity
 * 
 * OAuth 제공자(Google, Kakao, Naver 등)와 사용자 계정을 연결하는 테이블
 * 
 * 설계 원칙:
 * - 완전 분리 방식: 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 이메일이 자동으로 구분됨
 * - provider + provider_user_id 조합으로 고유성 보장
 * - 한 OAuthAccount는 정확히 하나의 User에 연결됨 (One-to-One 관계)
 * - 비즈니스 로직상 OAuth 계정 하나당 항상 새로운 User 생성
 */

@OneToOne(() => User, (user) => user.oauth_account, {
  onDelete: 'CASCADE',
  nullable: false,
})
@JoinColumn({ name: 'user_id' })
user: User;
```

### 3.3 User 엔티티 (`user.entity.ts`)

**변경 내용:**
- `@OneToMany` → `@OneToOne`로 변경
- 필드명: `oauth_accounts` (복수) → `oauth_account` (단수)
- 주석 업데이트: One-to-One 관계 명시
- 이메일 생성 로직 변경 반영

**주요 변경사항:**
```typescript
/**
 * User Entity
 * 
 * 사용자 기본 정보를 저장하는 테이블
 * OAuth Login으로 생성되며, 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 이메일이 자동으로 구분됨
 * 
 * 설계 원칙:
 * - 각 OAuth 제공자는 별도의 User로 취급 (완전 분리 방식)
 * - 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 이메일이 자동으로 구분됨
 *   (예: Google -> user@gmail.com, Kakao -> user@kakao.com)
 * - 원본 이메일을 그대로 사용 (provider prefix 불필요)
 * - OAuth 계정은 provider + provider_user_id 조합으로 식별
 * - 현재 비즈니스 로직: OAuth 계정 하나당 항상 새로운 User 생성 (One-to-One 관계)
 */

@OneToOne(() => OAuthAccount, (oauthAccount) => oauthAccount.user, {
  cascade: true,
})
oauth_account: OAuthAccount;  // 단수형으로 변경
```

### 3.4 AuthService (`auth.service.ts`)

**변경 내용:**
- 이메일 생성 로직 수정: provider prefix 제거
- 주석 업데이트: 이메일 생성 방식 및 관계 설명

**주요 변경사항:**
```typescript
/**
 * AuthService
 * 
 * OAuth 인증 관련 비즈니스 로직 처리
 * 
 * 설계 원칙:
 * - 완전 분리 방식: provider + provider_user_id만으로 식별
 * - 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 이메일이 자동으로 구분됨
 *   (예: Google -> user@gmail.com, Kakao -> user@kakao.com)
 * - 원본 이메일을 그대로 사용 (provider prefix 불필요)
 * - 트랜잭션으로 데이터 일관성 보장
 * - OAuth 계정 하나당 항상 새로운 User 생성 (One-to-One 관계)
 */

// 이메일 생성 로직
const generateUniqueEmail = (): string => {
  if (userInfo.email) {
    // OAuth 제공자에서 받은 원본 이메일 그대로 사용
    // 각 OAuth 제공자는 서로 다른 도메인을 사용하므로 자동으로 구분됨
    return userInfo.email;
  }
  // 이메일이 없으면 provider와 provider_user_id로 생성
  return `${userInfo.provider}_${userInfo.provider_user_id}@oauth.local`;
};
```

### 3.5 변경 요약

| 파일 | 변경 유형 | 변경 내용 |
|------|----------|----------|
| `oauth-account.entity.ts` | 관계 변경 | `@ManyToOne` → `@OneToOne` |
| `user.entity.ts` | 관계 변경 | `@OneToMany` → `@OneToOne`, `oauth_accounts` → `oauth_account` |
| `auth.service.ts` | 로직 수정 | 이메일 생성 로직: provider prefix 제거 |
| 모든 파일 | 주석 업데이트 | 이메일 생성 방식 및 관계 설명 업데이트 |

### 3.6 마이그레이션 필요사항

관계 변경으로 인해 마이그레이션이 필요할 수 있습니다:

```typescript
// 마이그레이션 파일: ChangeOAuthAccountToOneToOne.ts
export class ChangeOAuthAccountToOneToOne implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // One-to-One 관계는 데이터베이스 레벨에서 Many-to-One과 동일하게 동작
    // Foreign Key 제약조건은 그대로 유지
    // 추가 작업 불필요 (TypeORM 레벨 변경만)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백 불필요 (데이터베이스 구조 변경 없음)
  }
}
```

**참고:** One-to-One 관계는 데이터베이스 레벨에서 Many-to-One과 동일하게 구현되므로, 실제 데이터베이스 스키마 변경은 필요 없습니다. TypeORM 엔티티 정의만 변경하면 됩니다.

## 4. 이메일 생성 로직 변경 상세

### 4.1 변경 전

```typescript
// Google OAuth: user@gmail.com
// → google_user@gmail.com (prefix 추가)

// Kakao OAuth: user@kakao.com  
// → kakao_user@kakao.com (prefix 추가)
```

**문제점:**
- 불필요한 prefix 추가
- 원본 이메일과 다름
- 도메인이 이미 다르므로 prefix가 불필요

### 4.2 변경 후

```typescript
// Google OAuth: user@gmail.com
// → user@gmail.com (원본 그대로)

// Kakao OAuth: user@kakao.com
// → user@kakao.com (원본 그대로)
```

**장점:**
- 원본 이메일 유지
- 로직 단순화
- 도메인이 다르므로 자동으로 구분됨

### 4.3 이메일 구분 방식

| OAuth 제공자 | 도메인 예시 | 이메일 예시 |
|------------|-----------|-----------|
| Google | gmail.com | user@gmail.com |
| Kakao | kakao.com | user@kakao.com |
| Naver | naver.com | user@naver.com |

각 OAuth 제공자는 서로 다른 도메인을 사용하므로, 이메일이 자동으로 구분됩니다.

## 5. 결론

변경 사항 요약:

1. **관계 정의 수정**: Many-to-One/One-to-Many → One-to-One
2. **이메일 생성 로직 수정**: provider prefix 제거, 원본 이메일 그대로 사용
3. **주석 업데이트**: 실제 동작 방식을 정확히 반영

이 변경으로:
- 구조와 실제 동작이 일치
- 이메일 생성 로직이 단순하고 명확해짐
- 코드 가독성 향상
- 새로운 개발자가 빠르게 이해 가능

이 변경으로 시스템의 명확성이 향상되고, 향후 유지보수가 용이해집니다.
