/**
 * Environment Variables Schema
 * 
 * 환경 변수 타입 정의 및 검증을 위한 스키마
 * 
 * 사용 방법:
 * - ConfigModule에서 이 스키마를 사용하여 환경 변수 검증
 * - 타입 안정성 보장
 */

export interface EnvironmentVariables {
  // 애플리케이션 환경
  NODE_ENV: 'development' | 'production' | 'test';

  // PostgreSQL 데이터베이스
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;

  // MongoDB
  MONGO_HOST: string;
  MONGO_PORT: number;
  MONGO_DATABASE: string;

  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;

  // Admin 이메일 목록 (쉼표로 구분된 문자열)
  ADMIN_EMAILS?: string[];

  // 서버 포트 (선택사항)
  SERVER_PORT?: number;

  // AI 모델 서버 URL
  MODEL_SERVER_URL?: string;

  // S3 설정 (향후 구현 예정)
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;

  // 세션 설정
  SESSION_SECRET: string;
  SESSION_MAX_AGE?: number;  // 선택사항, 기본값 604800 (7일)

  // 프론트엔드 URL (Sub-path 방식)
  FRONTEND_URL?: string;

  // 인증 활성화 여부 (일시적으로 비활성화 가능)
  // false: 인증 없이 모든 API 접근 가능 (로그인 기능 완성 전까지)
  // true: 인증 필요 (main branch 배포 시 활성화)
  AUTH_ENABLED?: boolean;
}

/**
 * 필수 환경 변수 목록
 * 애플리케이션 시작 시 반드시 설정되어 있어야 하는 변수들
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
 * 
 * @param config ConfigService에서 가져온 환경 변수 객체
 * @returns 검증 성공 여부
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

