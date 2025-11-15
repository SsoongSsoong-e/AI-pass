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
        ? 'https://your-production-domain.com/auth/google/callback'
        : 'http://localhost:5002/auth/google/callback'
    ),

    // 시드 데이터 (개발용만)
    SEED_ADMIN_EMAIL: isDevelopment ? process.env.SEED_ADMIN_EMAIL : undefined,
    SEED_ADMIN_USERNAME: isDevelopment ? process.env.SEED_ADMIN_USERNAME : undefined,

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
  };

  return config;
});
