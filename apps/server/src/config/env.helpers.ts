import { join } from 'path';

/**
 * Environment Variables Helper
 * 
 * 환경 변수 파일 경로를 해결하고 관리하는 유틸리티
 * 
 * 파일 로드 우선순위 (위에서 아래로, 나중에 로드된 값이 우선):
 * 
 * 개발 환경 (NODE_ENV=development):
 * 1. .env.development.local (최우선, Git 무시)
 * 2. .env.local (로컬 개발용, Git 무시)
 * 3. .env.development
 * 4. .env
 * 5. apps/server/.env.local (하위 호환성)
 * 6. apps/server/.env (하위 호환성)
 * 
 * 프로덕션 환경 (NODE_ENV=production):
 * 1. .env.production.local (최우선, Git 무시)
 * 2. .env.production
 * 3. .env.local (로컬 오버라이드, Git 무시)
 * 4. .env
 * 5. apps/server/.env.production (하위 호환성)
 * 6. apps/server/.env (하위 호환성)
 */
export function resolveEnvPaths(baseDir: string, env = process.env.NODE_ENV || 'development'): string[] {
  const paths: string[] = [];

  // 1. 프로젝트 루트의 환경별 파일 (최우선)
  paths.push(join(baseDir, `.env.${env}.local`));  // .env.development.local 또는 .env.production.local
  if (env === 'development') {
    // 개발 환경에서는 .env.local도 로드
    paths.push(join(baseDir, '.env.local'));
  }
  paths.push(join(baseDir, `.env.${env}`));        // .env.development 또는 .env.production
  paths.push(join(baseDir, '.env'));                // .env

  // 2. apps/server 디렉토리의 파일 (하위 호환성)
  paths.push(join(baseDir, `apps/server/.env.${env}.local`));
  paths.push(join(baseDir, 'apps/server/.env.local'));
  paths.push(join(baseDir, `apps/server/.env.${env}`));
  paths.push(join(baseDir, 'apps/server/.env'));

  // 3. 구버전 파일 (deprecated - 제거 예정)
  paths.push(join(baseDir, 'apps/server/env.local'));

  return paths;
}

/**
 * 기본 환경 변수 값 (fallback)
 * 
 * 주의: 실제 환경 변수 파일(.env)을 사용하는 것을 권장합니다.
 * 이 값들은 환경 변수가 설정되지 않았을 때만 사용됩니다.
 */
export const ENV_DEFAULTS = {
    NODE_ENV: 'development',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: 5432,
    DATABASE_NAME: 'postgres',
    DATABASE_USER: 'postgres',
    DATABASE_PASSWORD: 'postgres',
    MONGO_HOST: 'localhost',
    MONGO_PORT: 27017,
    MONGO_DATABASE: 'ai-pass',
};

