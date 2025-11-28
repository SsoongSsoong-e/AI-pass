import { registerAs } from '@nestjs/config';
import { EnvironmentVariables } from './env.schema';

/**
 * 환경 변수 설정을 타입 안전하게 관리하는 Config Factory
 * 
 * dev/prod 환경에 따라 다른 기본값 사용
 * - 개발: localhost 기반 설정
 * - 프로덕션: Docker 서비스 이름 기반 설정
 */
export default registerAs('app', () => {
  const nodeEnv = (process.env.NODE_ENV as EnvironmentVariables['NODE_ENV']) || 'development';
  const isProduction = nodeEnv === 'production';

  const config: Partial<EnvironmentVariables> = {
    NODE_ENV: nodeEnv,

    DATABASE_HOST: process.env.DATABASE_HOST || (isProduction ? 'postgres' : 'localhost'),
    DATABASE_PORT: parseInt(process.env.DATABASE_PORT || '5432', 10),
    DATABASE_NAME: process.env.DATABASE_NAME || 'ai_pass',
    DATABASE_USER: process.env.DATABASE_USER || 'ai_pass',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || (isProduction ? '' : 'secret'),

    MONGO_HOST: process.env.MONGO_HOST || (isProduction ? 'mongodb' : 'localhost'),
    MONGO_PORT: parseInt(process.env.MONGO_PORT || '27017', 10),
    MONGO_DATABASE: process.env.MONGO_DATABASE || 'ai-pass',

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || (
      isProduction
        ? 'https://your-production-domain.com/api/auth/google/callback'
        : 'http://localhost:5173/api/auth/google/callback'
    ),

    ADMIN_EMAILS: process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim()).filter(email => email.length > 0)
      : [],

    SERVER_PORT: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 5002,

    MODEL_SERVER_URL: isProduction
      ? 'http://model-server:5001'
      : (process.env.MODEL_SERVER_URL || 'http://localhost:5001'),

    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,

    SESSION_SECRET: process.env.SESSION_SECRET || '',
    SESSION_MAX_AGE: process.env.SESSION_MAX_AGE
      ? parseInt(process.env.SESSION_MAX_AGE, 10)
      : 1800,

    FRONTEND_URL: process.env.FRONTEND_URL || (
      isProduction
        ? 'https://example.com'
        : 'http://localhost:5173'
    ),
  };

  return config;
});
