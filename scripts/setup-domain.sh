#!/bin/bash
# 도메인 기반 환경 변수 자동 생성 스크립트
# DOMAIN 환경 변수를 기반으로 FRONTEND_URL과 GOOGLE_CALLBACK_URL을 자동 생성

set -e

# DOMAIN 환경 변수 확인
if [ -z "$DOMAIN" ]; then
  # DOMAIN이 설정되지 않은 경우 (로컬 개발 환경)
  export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
  export GOOGLE_CALLBACK_URL="${GOOGLE_CALLBACK_URL:-http://localhost:5173/api/auth/google/callback}"
  echo "ℹ️  DOMAIN이 설정되지 않았습니다. 로컬 개발 환경 설정을 사용합니다."
  echo "   FRONTEND_URL: $FRONTEND_URL"
  echo "   GOOGLE_CALLBACK_URL: $GOOGLE_CALLBACK_URL"
else
  # DOMAIN이 설정된 경우 (프로덕션 환경)
  export FRONTEND_URL="https://${DOMAIN}"
  export GOOGLE_CALLBACK_URL="https://${DOMAIN}/api/auth/google/callback"
  echo "✅ 도메인 기반 환경 변수 생성 완료:"
  echo "   DOMAIN: $DOMAIN"
  echo "   FRONTEND_URL: $FRONTEND_URL"
  echo "   GOOGLE_CALLBACK_URL: $GOOGLE_CALLBACK_URL"
fi

# 환경 변수를 .env 파일에 저장 (선택사항)
if [ "$SAVE_TO_ENV" = "true" ]; then
  if [ -f .env ]; then
    # .env 파일이 있으면 업데이트
    if grep -q "^FRONTEND_URL=" .env; then
      sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" .env
    else
      echo "FRONTEND_URL=$FRONTEND_URL" >> .env
    fi
    
    if grep -q "^GOOGLE_CALLBACK_URL=" .env; then
      sed -i.bak "s|^GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=$GOOGLE_CALLBACK_URL|" .env
    else
      echo "GOOGLE_CALLBACK_URL=$GOOGLE_CALLBACK_URL" >> .env
    fi
    
    echo "✅ .env 파일이 업데이트되었습니다."
  fi
fi


