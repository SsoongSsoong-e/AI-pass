#!/bin/bash
# 프로덕션 HTTPS 배포 스크립트
# 도메인 기반 자동 설정 및 배포

set -e

# ============================================
# 도메인 설정 (여기에 직접 입력)
# ============================================
DOMAIN="visionitssu-ai-pass.org"
# ============================================

export DOMAIN

echo "🚀 프로덕션 배포 시작..."
echo "📋 배포 정보:"
echo "   도메인: $DOMAIN"

# 1. 도메인 기반 환경 변수 자동 생성
echo ""
echo "1️⃣  도메인 기반 환경 변수 생성 중..."
source ./scripts/setup-domain.sh

# 2. SSL 인증서 확인
echo ""
echo "2️⃣  SSL 인증서 확인 중..."
if [ ! -f "certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
  echo "⚠️  SSL 인증서가 없습니다. Let's Encrypt 인증서를 발급합니다..."
  ./scripts/setup-ssl.sh
else
  echo "✅ SSL 인증서가 이미 존재합니다."
fi

# 3. Nginx 설정 파일 생성
echo ""
echo "3️⃣  Nginx 설정 파일 생성 중..."
export DOMAIN
envsubst < nginx/nginx-production.conf.template > nginx/nginx-production.conf
echo "✅ Nginx 설정 파일 생성 완료: nginx/nginx-production.conf"

# 4. Docker Compose 실행
echo ""
echo "4️⃣  Docker Compose 실행 중..."
docker-compose -p ai-pass-prod -f docker-compose.yml up -d --build

echo ""
echo "✅ 프로덕션 배포 완료!"
echo "   접속 URL: https://${DOMAIN}"
echo ""
echo "📝 서비스 상태 확인:"
echo "   docker-compose -p ai-pass-prod ps"
echo ""
echo "📝 로그 확인:"
echo "   docker-compose -p ai-pass-prod logs -f"

