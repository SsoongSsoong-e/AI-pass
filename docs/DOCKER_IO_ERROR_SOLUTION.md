# Docker BuildKit I/O 에러 해결 가이드

## 에러 분석

### 발생한 에러
```
failed to solve: Internal: write /var/lib/docker/buildkit/containerd-overlayfs/metadata_v2.db: input/output error
```

### 원인
- Docker BuildKit의 내부 메타데이터 파일 시스템 오류
- 디스크 I/O 문제 또는 BuildKit 캐시 손상
- Docker 데몬의 내부 상태 문제

### 빌드 상태
- ✅ Model Server Poetry install: 성공 (45.3초)
- ✅ Poetry show 확인: 성공 (1.1초)
- ❌ `COPY . .` 단계: I/O 에러 발생

---

## 해결 방법 (순서대로 시도)

### 방법 1: BuildKit 캐시 정리 (가장 빠름)

```bash
# BuildKit 빌드 캐시 정리
docker builder prune -af

# 전체 시스템 정리 (더 강력함)
docker system prune -af --volumes
```

### 방법 2: Docker 데몬 재시작

```bash
# macOS (Docker Desktop)
# Docker Desktop 앱에서 재시작

# 또는 터미널에서
osascript -e 'quit app "Docker"' && sleep 2 && open -a Docker
```

### 방법 3: 수동 캐시 정리 후 재빌드

```bash
# 1. 모든 컨테이너 중지
docker-compose -p ai-pass-dev -f docker-compose.dev.yml down

# 2. BuildKit 캐시 정리
docker builder prune -af

# 3. 사용하지 않는 이미지/볼륨 정리
docker system prune -af

# 4. 재빌드
npm run dev:full
```

### 방법 4: Docker Desktop 완전 재시작 (강력)

1. Docker Desktop 완전 종료
2. 잠시 대기 (5초)
3. Docker Desktop 재시작
4. 재빌드 시도

---

## 추가 문제 해결

### Model Server Dockerfile 최적화

현재 Dockerfile의 설치 확인 단계가 복잡할 수 있습니다. 단순화:

```dockerfile
# 설치된 패키지 확인 단계 단순화
RUN poetry show mediapipe || (echo "ERROR: mediapipe not installed" && exit 1)
```

---

## 예방 방법

1. **정기적인 캐시 정리**
   ```bash
   docker system prune -af
   ```

2. **빌드 시 캐시 비활성화 (문제 발생 시)**
   ```bash
   docker-compose build --no-cache
   ```

3. **디스크 공간 모니터링**
   ```bash
   docker system df
   ```

---

## 다음 단계

1. BuildKit 캐시 정리 실행
2. 재빌드 시도
3. 여전히 실패하면 Docker Desktop 재시작
4. 성공 후 모든 컨테이너 상태 확인

