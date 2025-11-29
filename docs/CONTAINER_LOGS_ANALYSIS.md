# 컨테이너 로그 분석 결과 및 해결 방안

## 📊 현재 컨테이너 상태 요약

| 컨테이너 | 상태 | 문제점 | 우선순위 |
|---------|------|--------|---------|
| **postgres** | ✅ Healthy | 없음 | - |
| **mongodb** | ✅ Healthy | 없음 | - |
| **nginx** | ✅ Running | 없음 (SSL 인증서 생성 완료) | - |
| **backend** | ⚠️ Running (에러 발생) | sharp 모듈 로드 실패 | 🔴 높음 |
| **model-server** | ❌ Restarting | mediapipe 모듈 누락 | 🔴 높음 |
| **frontend-builder** | ✅ Running | 없음 (빌드 완료, nginx 실행 중) | - |

---

## 🔍 상세 문제 분석

### 1. Model Server - mediapipe 모듈 누락 ❌

**에러 로그:**
```
ModuleNotFoundError: No module named 'mediapipe'
Traceback:
  File "/app/run.py", line 1, in <module>
    from app import create_app
  File "/app/app/__init__.py", line 1, in <module>
    import mediapipe as mp
```

**원인:**
- Poetry install이 실행되었지만 mediapipe 패키지가 실제로 설치되지 않음
- `pyproject.toml`에 `mediapipe = "==0.10.18"`이 정의되어 있음
- 설치 과정에서 에러가 발생했거나 패키지가 설치되지 않음

**가능한 원인:**
1. Poetry install 시 mediapipe 설치 실패 (에러 로그 미출력)
2. 패키지 버전 호환성 문제
3. 시스템 의존성 부족 (mediapipe는 특정 시스템 라이브러리 필요)

**해결 방법:**
- ✅ Dockerfile에 설치 확인 단계 추가 (이미 적용)
- Mediapipe 설치에 필요한 시스템 라이브러리 확인 및 추가
- Poetry install 로그를 더 상세하게 출력

---

### 2. Backend - sharp 모듈 Alpine Linux 호환성 문제 ⚠️

**에러 로그:**
```
Error: Could not load the "sharp" module using the linuxmusl-arm64 runtime
Possible solutions:
- Ensure optional dependencies can be installed:
    npm install --include=optional sharp
- Add platform-specific dependencies:
    npm install --os=linux --libc=musl --cpu=arm64 sharp
```

**원인:**
- Backend가 `node:20-alpine` 이미지 사용 (Alpine = musl libc)
- Sharp 모듈이 Alpine Linux ARM64용 사전 빌드 바이너리가 없음
- Sharp는 네이티브 바이너리를 필요로 하는데, Alpine용 빌드 실패

**이미 적용된 수정:**
```dockerfile
# 시스템 라이브러리 추가
RUN apk add --no-cache vips-dev vips python3 make g++

# Sharp 재설치
RUN npm install --include=optional
```

**추가 해결 방법:**
1. **Alpine 대신 Debian 기반 이미지 사용** (권장)
   - `node:20-alpine` → `node:20-slim` (Debian 기반)
   - Debian은 sharp의 사전 빌드 바이너리를 지원

2. **Sharp 수동 빌드**
   - Alpine에서 sharp를 소스에서 빌드 (시간이 오래 걸림)

---

### 3. Frontend-builder 컨테이너 상태 ✅

**현재 상태:**
- 컨테이너가 계속 실행 중 (`Up 18 minutes`)
- Multi-stage build의 Stage 2 (nginx)를 실행 중

**설명:**
- Frontend-builder는 빌드 완료 후 nginx를 실행하여 볼륨에 파일을 마운트
- nginx가 실행 중이므로 컨테이너가 계속 실행되는 것은 정상
- 실제 프론트엔드는 별도의 nginx 컨테이너가 서빙

**참고:**
- 프로덕션 docker-compose.yml도 동일한 구조
- Frontend-builder가 nginx를 실행하지만, 별도의 nginx 컨테이너가 실제 요청을 처리

---

## 🔧 해결 방안

### 우선순위 1: Model Server - mediapipe 설치 문제

**수정 적용됨:**
- Dockerfile에 설치 확인 단계 추가
- Poetry install 실패 시 verbose 로그 출력

**추가 필요:**
- Mediapipe 설치에 필요한 시스템 라이브러리 확인
- 빌드 로그에서 실제 설치 상태 확인

---

### 우선순위 2: Backend - sharp 모듈 문제

**현재 상태:**
- Dockerfile.dev에 시스템 라이브러리 추가됨
- 하지만 여전히 에러 발생 중

**권장 해결책:**
- Alpine Linux 대신 Debian 기반 이미지 사용 (`node:20-slim`)

---

## 📝 컨테이너 수 정리

**현재 6개 컨테이너:**
1. postgres - PostgreSQL 데이터베이스 ✅
2. mongodb - MongoDB 데이터베이스 ✅
3. model-server - AI 모델 서버 ❌ (재시작 중)
4. backend - NestJS 백엔드 ⚠️ (에러 발생)
5. frontend-builder - 프론트엔드 빌드 ✅ (nginx 실행 중)
6. nginx - 리버스 프록시 ✅

**예상 정상 상태:**
- 5개 실행 중 컨테이너 (postgres, mongodb, model-server, backend, nginx)
- frontend-builder는 빌드 완료 후 종료되어야 하지만, 현재 구조에서는 nginx를 실행 중이므로 유지됨

**참고:**
- 프로덕션과 동일한 구조이므로, frontend-builder가 실행 중인 것은 정상일 수 있음
- 실제로는 nginx 컨테이너가 모든 요청을 처리

---

## 🚀 즉시 실행할 해결 단계

1. **Model Server 재빌드** - mediapipe 설치 확인
2. **Backend Dockerfile 수정** - Debian 기반 이미지로 변경 (sharp 문제 해결)
3. **모든 컨테이너 재시작** - 변경 사항 적용
