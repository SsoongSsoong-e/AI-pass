#!/bin/bash
# 자체 서명 SSL 인증서 생성 스크립트
# 로컬 개발/테스트 환경에서 HTTPS 테스트용

set -e

DOMAIN=${DOMAIN:-localhost}
SSL_DIR="./nginx/ssl"

echo "🔐 자체 서명 SSL 인증서 생성 중..."
echo "   도메인: $DOMAIN"

# SSL 디렉토리 생성
mkdir -p "$SSL_DIR"

# 자체 서명 인증서 생성
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/${DOMAIN}-key.pem" \
  -out "$SSL_DIR/${DOMAIN}.pem" \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=AI-Pass/CN=$DOMAIN"

echo "✅ SSL 인증서 생성 완료:"
echo "   인증서: $SSL_DIR/${DOMAIN}.pem"
echo "   개인키: $SSL_DIR/${DOMAIN}-key.pem"
echo ""
echo "⚠️  주의: 자체 서명 인증서는 브라우저에서 경고가 표시됩니다."
echo "   프로덕션 환경에서는 Let's Encrypt 인증서를 사용하세요."


