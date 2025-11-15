import 'reflect-metadata';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { User } from '../../users/entities/user.entity';
import { connect, connection, model, Schema } from 'mongoose';

/**
 * Passport Photos MongoDB 마이그레이션 스크립트
 * 
 * PostgreSQL의 passport_photos 테이블 데이터를 MongoDB로 이전
 * 
 * 실행 방법:
 * npm run migration:passport-photos
 * 또는
 * ts-node -r tsconfig-paths/register src/database/migrations/migrate-passport-photos-to-mongodb.ts
 */

// MongoDB Schema 정의
const PassportPhotoSchema = new Schema({
  user_id: { type: Number, required: true, index: true },
  s3_key: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  is_locked: { type: Boolean, default: false },
}, { timestamps: true });

// 인덱스 추가
PassportPhotoSchema.index({ user_id: 1, created_at: -1 });
PassportPhotoSchema.index({ user_id: 1, is_locked: 1 });
PassportPhotoSchema.index({ user_id: 1, is_locked: 1, created_at: 1 });

const PassportPhotoModel = model('PassportPhoto', PassportPhotoSchema);

async function migratePassportPhotosToMongoDB() {
  console.log('========================================');
  console.log('Passport Photos MongoDB 마이그레이션 시작');
  console.log('========================================\n');

  try {
    // 1. PostgreSQL 연결
    console.log('1. PostgreSQL 연결 중...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ PostgreSQL 연결 완료\n');

    // 2. MongoDB 연결
    console.log('2. MongoDB 연결 중...');
    const mongoHost = process.env.MONGO_HOST || 'localhost';
    const mongoPort = process.env.MONGO_PORT || '27017';
    const mongoDatabase = process.env.MONGO_DATABASE || 'ai-pass';
    const mongoUri = `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`;
    
    await connect(mongoUri);
    console.log(`✅ MongoDB 연결 완료: ${mongoUri}\n`);

    // 3. 기존 MongoDB 데이터 확인 (선택사항)
    const existingCount = await PassportPhotoModel.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  경고: MongoDB에 이미 ${existingCount}개의 사진이 존재합니다.`);
      console.log('   기존 데이터를 삭제하고 새로 마이그레이션하시겠습니까? (y/n)');
      // 실제 실행 시에는 사용자 입력을 받거나, --force 플래그로 처리
      console.log('   (현재는 건너뜁니다. 수동으로 확인 후 진행하세요.)\n');
    }

    // 4. PostgreSQL에서 모든 사용자 조회
    console.log('3. PostgreSQL에서 사용자 조회 중...');
    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find();
    console.log(`✅ ${users.length}명의 사용자 발견\n`);

    let migratedCount = 0;
    let errorCount = 0;
    let totalPhotosMigrated = 0;

    // 5. 각 사용자별로 사진 마이그레이션
    console.log('4. 사진 데이터 마이그레이션 시작...\n');
    
    for (const user of users) {
      try {
        // 사용자별 최신 10개 사진만 선택 (raw SQL 쿼리)
        const photos = await AppDataSource.manager.query(
          `SELECT id, user_id, s3_key, created_at 
           FROM passport_photos 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT 10`,
          [user.id]
        );

        if (photos.length === 0) {
          console.log(`   사용자 ${user.id} (${user.email}): 사진 없음 - 건너뜀`);
          continue;
        }

        // MongoDB에 데이터 삽입
        const mongoPhotos = photos.map(photo => ({
          user_id: user.id,
          s3_key: photo.s3_key,
          created_at: photo.created_at,
          is_locked: false, // 기본값: 잠금 해제
        }));

        await PassportPhotoModel.insertMany(mongoPhotos);

        migratedCount++;
        totalPhotosMigrated += photos.length;
        console.log(`   ✅ 사용자 ${user.id} (${user.email}): ${photos.length}개 사진 마이그레이션 완료`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ 사용자 ${user.id} 마이그레이션 실패:`, error.message);
      }
    }

    // 6. 마이그레이션 결과 출력
    console.log('\n========================================');
    console.log('마이그레이션 완료');
    console.log('========================================');
    console.log(`성공: ${migratedCount}명의 사용자`);
    console.log(`실패: ${errorCount}명의 사용자`);
    console.log(`총 마이그레이션된 사진: ${totalPhotosMigrated}개`);
    console.log('========================================\n');

    // 7. 연결 종료
    await AppDataSource.destroy();
    await connection.close();
    console.log('✅ 데이터베이스 연결 종료');

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  migratePassportPhotosToMongoDB()
    .then(() => {
      console.log('\n✅ 마이그레이션 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 마이그레이션 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { migratePassportPhotosToMongoDB };

