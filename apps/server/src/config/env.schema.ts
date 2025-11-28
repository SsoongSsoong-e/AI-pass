/**
 * 환경 변수 타입 정의 및 검증을 위한 스키마
 */
export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production';

  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;

  MONGO_HOST: string;
  MONGO_PORT: number;
  MONGO_DATABASE: string;

  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;

  ADMIN_EMAILS?: string[];
  SERVER_PORT?: number;
  MODEL_SERVER_URL?: string;

  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;

  SESSION_SECRET: string;
  SESSION_MAX_AGE?: number;

  FRONTEND_URL?: string;
}

/**
 * 필수 환경 변수 목록
 */
export const REQUIRED_ENV_VARS: (keyof EnvironmentVariables)[] = [
  'NODE_ENV',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'MONGO_HOST',
  'MONGO_PORT',
  'MONGO_DATABASE',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'SESSION_SECRET',
];

/**
 * 환경 변수 검증 함수
 */
export function validateEnvVariables(config: Partial<EnvironmentVariables>): {
  isValid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = config[key];
    if (value === undefined || value === null || value === '') {
      missing.push(key);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}

