import 'reflect-metadata';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { resolveEnvPaths } from '../config/env.helpers';

/**
 * TypeORM DataSource 환경 변수 로드
 * 
 * ConfigModule과 동일한 경로 우선순위를 사용하여 일관성 유지
 * 마이그레이션 실행 시에도 동일한 환경 변수를 사용할 수 있도록 함
 */
const NODE_ENV = process.env.NODE_ENV || 'development';
const envPaths = resolveEnvPaths(process.cwd(), NODE_ENV);

// 환경 변수 파일 로드 (ConfigModule과 동일한 우선순위)
for (const filePath of envPaths) {
    if (existsSync(filePath)) {
        config({ path: filePath, override: true });
    }
}

const options: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'postgres',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export const AppDataSource = new DataSource(options);

