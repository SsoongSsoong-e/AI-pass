#!/bin/bash
# 로컬 HTTP 배포 스크립트
# 개발/테스트 환경에서 사용

set -e

echo "🚀 로컬 배포 시작..."

# Nginx 설정 파일 복사
cp nginx/nginx-local.conf nginx/nginx.conf

# Docker Compose 실행 (로컬 설정 사용)
docker-compose -p ai-pass-prod -f docker-compose.yml up -d --build

echo "✅ 로컬 배포 완료!"
echo "   접속 URL: http://localhost"
echo ""
echo "📝 서비스 상태 확인:"
echo "   docker-compose -p ai-pass-prod ps"


