import { registerAs } from '@nestjs/config';
import { EnvironmentVariables } from './env.schema';

/**
 * 환경 변수 설정을 타입 안전하게 관리하는 Config Factory
 * 
 * dev/prod 환경에 따라 다른 기본값 사용
 * - 개발 환경: localhost 기반 설정
 * - 프로덕션 환경: Docker 서비스 이름 기반 설정
 */

export default registerAs('app', () => {
  const nodeEnv = (process.env.NODE_ENV as EnvironmentVariables['NODE_ENV']) || 'development';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  const config: Partial<EnvironmentVariables> = {
    // 애플리케이션 환경
    NODE_ENV: nodeEnv,

    // PostgreSQL 데이터베이스
    DATABASE_HOST: process.env.DATABASE_HOST || (isProduction ? 'postgres' : 'localhost'),
    DATABASE_PORT: parseInt(process.env.DATABASE_PORT || '5432', 10),
    DATABASE_NAME: process.env.DATABASE_NAME || 'ai_pass',
    DATABASE_USER: process.env.DATABASE_USER || 'ai_pass',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || (isProduction ? '' : 'secret'),

    // MongoDB
    MONGO_HOST: process.env.MONGO_HOST || (isProduction ? 'mongodb' : 'localhost'),
    MONGO_PORT: parseInt(process.env.MONGO_PORT || '27017', 10),
    MONGO_DATABASE: process.env.MONGO_DATABASE || 'ai-pass',

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || (
      isProduction 
        ? 'https://your-production-domain.com/api/auth/google/callback'
        : 'http://localhost:5173/api/auth/google/callback'  // 프록시를 통해 처리
    ),

    // Admin 이메일 목록 (쉼표로 구분된 문자열을 배열로 파싱)
    ADMIN_EMAILS: process.env.ADMIN_EMAILS 
      ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim()).filter(email => email.length > 0)
      : [],

    // 서버 포트
    SERVER_PORT: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 5002,

    // AI 모델 서버 URL
    // 개발: localhost, 프로덕션: Docker 내부에서는 host.docker.internal
    MODEL_SERVER_URL: process.env.MODEL_SERVER_URL || (
      isProduction
        ? (process.platform === 'linux' 
            ? 'http://172.17.0.1:5001' 
            : 'http://host.docker.internal:5001')
        : 'http://localhost:5001'
    ),

    // S3 설정 (향후 구현)
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,

    // 세션 설정
    SESSION_SECRET: process.env.SESSION_SECRET || '',
    SESSION_MAX_AGE: process.env.SESSION_MAX_AGE 
      ? parseInt(process.env.SESSION_MAX_AGE, 10) 
      : 604800,  // 기본값: 7일

    // 프론트엔드 URL (Sub-path 방식)
    FRONTEND_URL: process.env.FRONTEND_URL || (
      isProduction
        ? 'https://example.com' // 배포 시에 환경 변수로 실제 도메인 설정해야함
        : 'http://localhost:5173'
    ),

    // 인증 활성화 여부
    // 개발 환경: false (인증 없이 사용)
    // 프로덕션 환경: true (인증 필요)
    AUTH_ENABLED: process.env.AUTH_ENABLED === 'true' || false,
  };

  return config;
});
