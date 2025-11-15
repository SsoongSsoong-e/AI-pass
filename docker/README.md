# Docker 개발 환경 가이드

## 사용 방법

1. `docker/server.env.example` 파일을 복사하여 `docker/server.env`로 저장하고 필요한 값을 조정합니다.
2. 다음 명령으로 PostgreSQL, MongoDB, NestJS 서버 컨테이너를 동시에 실행합니다.
   ```bash
   docker compose up --build
   ```
3. 서버 컨테이너는 포트 `5002`, PostgreSQL은 포트 `5432`, MongoDB는 포트 `27017`에 매핑됩니다.

## 서비스 구성

### PostgreSQL
- 컨테이너명: `ai-pass-postgres`
- 포트: `5432`
- 데이터베이스: `ai_pass`
- 볼륨: `postgres_data`

### MongoDB
- 컨테이너명: `ai-pass-mongodb`
- 포트: `27017`
- 데이터베이스: `ai-pass`
- 볼륨: `mongodb_data`

### Server (NestJS)
- 컨테이너명: `ai-pass-server`
- 포트: `5002`
- 의존성: PostgreSQL, MongoDB (healthcheck 완료 후 시작)

## 볼륨

- `postgres_data`: PostgreSQL 데이터 영속화 (컨테이너 재기동 시 데이터 유지)
- `mongodb_data`: MongoDB 데이터 영속화 (컨테이너 재기동 시 데이터 유지)
- 코드 변경은 로컬 디렉터리를 볼륨으로 연결하여 즉시 반영됩니다.

## 환경 변수

환경 변수 기본값은 `docker/server.env.example`을 참고하세요.

### PostgreSQL 설정
- `DATABASE_HOST`: postgres
- `DATABASE_PORT`: 5432
- `DATABASE_NAME`: ai_pass
- `DATABASE_USER`: ai_pass
- `DATABASE_PASSWORD`: secret

### MongoDB 설정
- `MONGO_HOST`: mongodb (Docker Compose 내부), localhost (로컬 개발)
- `MONGO_PORT`: 27017
- `MONGO_DATABASE`: ai-pass

## 기타

- 배포 환경에서는 별도의 compose 파일을 생성하거나 Kubernetes 매니페스트로 전환하는 것을 권장합니다.
- MongoDB는 Passport Photos 데이터를 저장하는 데 사용됩니다.

