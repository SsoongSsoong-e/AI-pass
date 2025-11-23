# RESTful API 리팩토링 후 테스트 가이드

## 개요

Phase 2 RESTful API 리팩토링이 완료되었습니다. 이 문서는 리팩토링 후 변경된 API 엔드포인트를 테스트하는 방법을 안내합니다.

## 주요 변경사항

### 1. 엔드포인트 변경

#### ✅ 새로 추가된 엔드포인트

- `POST /passport-photos` - 파일 업로드 및 저장 (기존 `POST /photo-edit/save` 통합)
- `GET /passport-photos/:photoId` - 특정 사진 조회
- `PATCH /passport-photos/:photoId` - 사진 수정 (잠금/잠금 해제 통합)

#### ❌ 제거된 엔드포인트

- `POST /photo-edit/save` - `POST /passport-photos`로 통합
- `GET /passport-photos/count` - `GET /passport-photos?include=count`로 통합
- `GET /passport-photos/locked` - `GET /passport-photos?filter=locked`로 통합
- `GET /passport-photos/unlocked` - `GET /passport-photos?filter=unlocked`로 통합
- `POST /passport-photos/:s3Key/lock` - `PATCH /passport-photos/:photoId`로 통합
- `POST /passport-photos/:s3Key/unlock` - `PATCH /passport-photos/:photoId`로 통합
- `DELETE /passport-photos/:s3Key` - `DELETE /passport-photos/:photoId`로 변경 (photo_id 기반)

#### 🔄 변경된 엔드포인트

- `GET /passport-photos` - 쿼리 파라미터로 필터링 및 통계 포함 가능
- `DELETE /passport-photos/:photoId` - s3Key 대신 photo_id 사용

## 테스트 시나리오

### 시나리오 1: 사진 업로드 및 저장

**엔드포인트**: `POST /passport-photos`

**변경사항**: 기존 `POST /photo-edit/save`가 통합됨

**테스트 방법**:

```bash
# cURL 예시
curl -X POST http://localhost:3000/passport-photos \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/path/to/image.jpg" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**예상 응답**:

```json
{
  "message": "사진이 저장되었습니다.",
  "photo": {
    "_id": "...",
    "user_id": 1,
    "photos": [
      {
        "photo_id": "photo_1704067200000_abc123xyz",
        "s3_key": "passport-photos/2024/01/uuid.png",
        "is_locked": false,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "_stats": {
      "total": 1,
      "locked": 0,
      "unlocked": 1,
      "oldest_unlocked_index": 0
    }
  },
  "s3Key": "passport-photos/2024/01/uuid.png"
}
```

**확인 사항**:
- ✅ 이미지가 편집되어 S3에 저장되는지
- ✅ MongoDB에 메타데이터가 저장되는지
- ✅ photo_id가 생성되는지
- ✅ 10개 초과 시 FIFO 삭제가 작동하는지

---

### 시나리오 2: 사진 목록 조회 (기본)

**엔드포인트**: `GET /passport-photos`

**변경사항**: 쿼리 파라미터로 필터링 및 통계 포함 가능

**테스트 방법**:

```bash
# 기본 조회
curl -X GET http://localhost:3000/passport-photos \
  -b "connect.sid=YOUR_SESSION_ID"
```

**예상 응답**:

```json
{
  "photos": [
    {
      "photo_id": "photo_1704067200000_abc123xyz",
      "s3_key": "passport-photos/2024/01/uuid.png",
      "is_locked": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**확인 사항**:
- ✅ 사진 목록이 반환되는지
- ✅ 최신순으로 정렬되는지

---

### 시나리오 3: 사진 목록 조회 (Presigned URL 포함)

**엔드포인트**: `GET /passport-photos?includeUrls=true`

**테스트 방법**:

```bash
curl -X GET "http://localhost:3000/passport-photos?includeUrls=true" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**예상 응답**:

```json
{
  "photos": [
    {
      "photo_id": "photo_1704067200000_abc123xyz",
      "s3_key": "passport-photos/2024/01/uuid.png",
      "is_locked": false,
      "created_at": "2024-01-01T00:00:00.000Z",
      "presignedUrl": {
        "url": "https://s3.amazonaws.com/...",
        "expiresAt": 1704070800000
      }
    }
  ]
}
```

**확인 사항**:
- ✅ Presigned URL이 생성되는지
- ✅ URL이 유효한지 (브라우저에서 접근 가능한지)
- ✅ 만료 시간이 올바른지 (1시간 후)

---

### 시나리오 4: 사진 목록 조회 (통계 포함)

**엔드포인트**: `GET /passport-photos?include=count`

**변경사항**: 기존 `GET /passport-photos/count`가 통합됨

**테스트 방법**:

```bash
curl -X GET "http://localhost:3000/passport-photos?include=count" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**예상 응답**:

```json
{
  "photos": [...],
  "count": {
    "total": 5,
    "locked": 2,
    "unlocked": 3,
    "maxCount": 10
  }
}
```

**확인 사항**:
- ✅ 통계 정보가 포함되는지
- ✅ 숫자가 정확한지

---

### 시나리오 5: 사진 목록 조회 (필터링 - 잠금된 사진만)

**엔드포인트**: `GET /passport-photos?filter=locked`

**변경사항**: 기존 `GET /passport-photos/locked`가 통합됨

**테스트 방법**:

```bash
curl -X GET "http://localhost:3000/passport-photos?filter=locked" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**예상 응답**:

```json
{
  "photos": [
    {
      "photo_id": "photo_1704067200000_abc123xyz",
      "s3_key": "passport-photos/2024/01/uuid.png",
      "is_locked": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**확인 사항**:
- ✅ 잠금된 사진만 반환되는지
- ✅ 잠금 해제된 사진은 제외되는지

---

### 시나리오 6: 사진 목록 조회 (필터링 - 잠금 해제된 사진만)

**엔드포인트**: `GET /passport-photos?filter=unlocked`

**변경사항**: 기존 `GET /passport-photos/unlocked`가 통합됨

**테스트 방법**:

```bash
curl -X GET "http://localhost:3000/passport-photos?filter=unlocked" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**확인 사항**:
- ✅ 잠금 해제된 사진만 반환되는지
- ✅ 잠금된 사진은 제외되는지

---

### 시나리오 7: 특정 사진 조회

**엔드포인트**: `GET /passport-photos/:photoId`

**변경사항**: 새로 추가된 엔드포인트

**테스트 방법**:

```bash
# photo_id는 사진 목록 조회에서 얻을 수 있음
curl -X GET "http://localhost:3000/passport-photos/photo_1704067200000_abc123xyz" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**예상 응답**:

```json
{
  "photo_id": "photo_1704067200000_abc123xyz",
  "s3_key": "passport-photos/2024/01/uuid.png",
  "is_locked": false,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Presigned URL 포함**:

```bash
curl -X GET "http://localhost:3000/passport-photos/photo_1704067200000_abc123xyz?includeUrls=true" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**확인 사항**:
- ✅ 특정 사진이 조회되는지
- ✅ 존재하지 않는 photo_id일 때 404 에러가 반환되는지
- ✅ includeUrls=true일 때 Presigned URL이 포함되는지

---

### 시나리오 8: 사진 수정 (잠금)

**엔드포인트**: `PATCH /passport-photos/:photoId`

**변경사항**: 기존 `POST /passport-photos/:s3Key/lock`가 통합됨

**테스트 방법**:

```bash
curl -X PATCH "http://localhost:3000/passport-photos/photo_1704067200000_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{"is_locked": true}' \
  -b "connect.sid=YOUR_SESSION_ID"
```

**예상 응답**:

```json
{
  "message": "사진이 수정되었습니다."
}
```

**확인 사항**:
- ✅ 사진이 잠금되는지
- ✅ 이미 잠금된 사진을 다시 잠금하려고 할 때 에러가 발생하는지
- ✅ 존재하지 않는 photo_id일 때 404 에러가 반환되는지

---

### 시나리오 9: 사진 수정 (잠금 해제)

**엔드포인트**: `PATCH /passport-photos/:photoId`

**변경사항**: 기존 `POST /passport-photos/:s3Key/unlock`가 통합됨

**테스트 방법**:

```bash
curl -X PATCH "http://localhost:3000/passport-photos/photo_1704067200000_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{"is_locked": false}' \
  -b "connect.sid=YOUR_SESSION_ID"
```

**확인 사항**:
- ✅ 사진 잠금이 해제되는지
- ✅ 이미 잠금 해제된 사진을 다시 해제하려고 할 때 에러가 발생하는지

---

### 시나리오 10: 사진 삭제 (photo_id 기반)

**엔드포인트**: `DELETE /passport-photos/:photoId`

**변경사항**: 기존 `DELETE /passport-photos/:s3Key`가 photo_id 기반으로 변경됨

**테스트 방법**:

```bash
curl -X DELETE "http://localhost:3000/passport-photos/photo_1704067200000_abc123xyz" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**예상 응답**:

```json
{
  "message": "사진이 삭제되었습니다."
}
```

**확인 사항**:
- ✅ 사진이 삭제되는지
- ✅ S3에서 파일이 삭제되는지
- ✅ MongoDB에서 메타데이터가 삭제되는지
- ✅ 잠금된 사진을 삭제하려고 할 때 403 에러가 반환되는지
- ✅ 존재하지 않는 photo_id일 때 404 에러가 반환되는지

---

### 시나리오 11: 모든 사진 삭제

**엔드포인트**: `DELETE /passport-photos`

**변경사항**: 없음 (기존과 동일)

**테스트 방법**:

```bash
# 기본 삭제 (잠금된 사진 제외)
curl -X DELETE "http://localhost:3000/passport-photos" \
  -b "connect.sid=YOUR_SESSION_ID"

# 강제 삭제 (잠금된 사진 포함)
curl -X DELETE "http://localhost:3000/passport-photos?force=true" \
  -b "connect.sid=YOUR_SESSION_ID"
```

**확인 사항**:
- ✅ 잠금 해제된 사진이 삭제되는지
- ✅ 잠금된 사진은 기본적으로 삭제되지 않는지
- ✅ force=true일 때 잠금된 사진도 삭제되는지
- ✅ S3에서 파일이 삭제되는지
- ✅ MongoDB에서 메타데이터가 삭제되는지

---

## 마이그레이션 체크리스트

기존 클라이언트 코드를 업데이트해야 하는 경우:

- [ ] `POST /photo-edit/save` → `POST /passport-photos`로 변경
- [ ] `GET /passport-photos/count` → `GET /passport-photos?include=count`로 변경
- [ ] `GET /passport-photos/locked` → `GET /passport-photos?filter=locked`로 변경
- [ ] `GET /passport-photos/unlocked` → `GET /passport-photos?filter=unlocked`로 변경
- [ ] `POST /passport-photos/:s3Key/lock` → `PATCH /passport-photos/:photoId` (body: `{"is_locked": true}`)로 변경
- [ ] `POST /passport-photos/:s3Key/unlock` → `PATCH /passport-photos/:photoId` (body: `{"is_locked": false}`)로 변경
- [ ] `DELETE /passport-photos/:s3Key` → `DELETE /passport-photos/:photoId`로 변경 (s3Key 대신 photo_id 사용)

## 주의사항

1. **photo_id 사용**: 모든 엔드포인트에서 `s3_key` 대신 `photo_id`를 사용합니다.
2. **쿼리 파라미터**: 여러 옵션을 조합할 수 있습니다 (예: `?includeUrls=true&include=count&filter=locked`).
3. **에러 처리**: 존재하지 않는 `photo_id`를 사용하면 404 에러가 반환됩니다.
4. **잠금 상태**: 잠금된 사진은 삭제할 수 없으며, 먼저 잠금을 해제해야 합니다.

## Swagger 문서 확인

서버 실행 후 다음 URL에서 Swagger 문서를 확인할 수 있습니다:

```
http://localhost:3000/api
```

모든 엔드포인트의 상세한 설명과 예시를 확인할 수 있습니다.

