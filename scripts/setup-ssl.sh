#!/bin/bash
# Let's Encrypt SSL 인증서 발급 스크립트
# 프로덕션 환경에서 사용

set -e

# DOMAIN 환경 변수 확인
if [ -z "$DOMAIN" ]; then
  echo "❌ DOMAIN 환경 변수가 설정되지 않았습니다."
  echo "   사용법: DOMAIN=example.com ./scripts/setup-ssl.sh"
  exit 1
fi

SSL_EMAIL=${SSL_EMAIL:-admin@${DOMAIN}}

echo "🔐 Let's Encrypt SSL 인증서 발급 중..."
echo "   도메인: $DOMAIN"
echo "   이메일: $SSL_EMAIL"

# Certbot을 사용한 인증서 발급
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$SSL_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo "✅ SSL 인증서 발급 완료!"
echo "   인증서 위치: certbot/conf/live/$DOMAIN/"
echo ""
echo "📝 다음 단계:"
echo "   1. Nginx 설정 파일 생성: envsubst < nginx/nginx-production.conf.template > nginx/nginx-production.conf"
echo "   2. Docker Compose 실행: npm run prod"


