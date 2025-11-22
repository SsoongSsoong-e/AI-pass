import 'reflect-metadata';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { connect, connection, model, Schema } from 'mongoose';

/**
 * Passport Photos 하이브리드 구조 마이그레이션 스크립트
 * 
 * 기존 1:N 구조 (각 사진마다 별도 문서)를
 * 하이브리드 구조 (사용자당 하나의 문서, 배열로 관리)로 변환
 * 
 * 실행 방법:
 * npm run migration:hybrid-structure
 * 또는
 * ts-node -r tsconfig-paths/register src/database/migrations/migrate-to-hybrid-structure.ts
 */

const MAX_PHOTOS_PER_USER = 10;

// 기존 스키마 (1:N 구조)
const OldPassportPhotoSchema = new Schema({
  user_id: { type: Number, required: true, index: true },
  s3_key: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  is_locked: { type: Boolean, default: false },
}, { timestamps: true });

// 새 스키마 (하이브리드 구조)
const NewPassportPhotoSchema = new Schema({
  user_id: { type: Number, required: true, index: true, unique: true },
  photos: [{
    photo_id: { type: String, required: true },
    s3_key: { type: String, required: true },
    is_locked: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
  }],
  _stats: {
    total: { type: Number, default: 0 },
    locked: { type: Number, default: 0 },
    unlocked: { type: Number, default: 0 },
    oldest_unlocked_index: { type: Number, default: -1 }
  }
}, { 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
});

// 인덱스 추가
NewPassportPhotoSchema.index({ user_id: 1 });
NewPassportPhotoSchema.index({ 'photos.created_at': -1 });
NewPassportPhotoSchema.index({ 'photos.is_locked': 1 });

const OldPassportPhotoModel = model('PassportPhoto', OldPassportPhotoSchema, 'passportphotos');
const NewPassportPhotoModel = model('PassportPhotoNew', NewPassportPhotoSchema, 'passportphotos_new');

/**
 * 통계 계산 함수
 */
function calculateStats(photos: any[]): any {
  let oldestIndex = -1;
  let oldestDate = Infinity;
  let lockedCount = 0;

  for (let i = 0; i < photos.length; i++) {
    if (photos[i].is_locked) {
      lockedCount++;
    } else if (photos[i].created_at.getTime() < oldestDate) {
      oldestDate = photos[i].created_at.getTime();
      oldestIndex = i;
    }
  }

  return {
    total: photos.length,
    locked: lockedCount,
    unlocked: photos.length - lockedCount,
    oldest_unlocked_index: oldestIndex,
  };
}

async function migrateToHybridStructure() {
  console.log('========================================');
  console.log('하이브리드 구조 마이그레이션 시작');
  console.log('========================================\n');

  try {
    // 1. MongoDB 연결
    console.log('1. MongoDB 연결 중...');
    const mongoHost = process.env.MONGO_HOST || 'localhost';
    const mongoPort = process.env.MONGO_PORT || '27017';
    const mongoDatabase = process.env.MONGO_DATABASE || 'ai-pass';
    const mongoUri = `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`;
    
    await connect(mongoUri);
    console.log(`✅ MongoDB 연결 완료: ${mongoUri}\n`);

    // 2. 기존 데이터 확인
    console.log('2. 기존 데이터 확인 중...');
    const oldCount = await OldPassportPhotoModel.countDocuments();
    console.log(`✅ 기존 문서 개수: ${oldCount}개\n`);

    if (oldCount === 0) {
      console.log('⚠️  마이그레이션할 데이터가 없습니다.');
      await connection.close();
      return;
    }

    // 3. 사용자별로 그룹화
    console.log('3. 사용자별로 데이터 그룹화 중...');
    const allPhotos = await OldPassportPhotoModel.find().sort({ user_id: 1, created_at: 1 });
    
    const userPhotosMap = new Map<number, any[]>();
    for (const photo of allPhotos) {
      if (!userPhotosMap.has(photo.user_id)) {
        userPhotosMap.set(photo.user_id, []);
      }
      userPhotosMap.get(photo.user_id)!.push(photo);
    }
    
    console.log(`✅ ${userPhotosMap.size}명의 사용자 발견\n`);

    // 4. 하이브리드 구조로 변환
    console.log('4. 하이브리드 구조로 변환 중...\n');
    
    let migratedUsers = 0;
    let totalPhotosMigrated = 0;
    let skippedPhotos = 0;

    for (const [userId, photos] of userPhotosMap.entries()) {
      try {
        // 최대 10개만 선택 (최신순)
        const sortedPhotos = photos
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
          .slice(0, MAX_PHOTOS_PER_USER);

        // 하이브리드 구조로 변환
        const newPhotos = sortedPhotos.map((photo, index) => ({
          photo_id: `photo_${photo.created_at.getTime()}_${index}`,
          s3_key: photo.s3_key,
          is_locked: photo.is_locked || false,
          created_at: photo.created_at || new Date(),
        }));

        // 통계 계산
        const stats = calculateStats(newPhotos);

        // 새 문서 생성
        const newDoc = new NewPassportPhotoModel({
          user_id: userId,
          photos: newPhotos,
          _stats: stats,
          created_at: sortedPhotos[0]?.created_at || new Date(),
        });

        await newDoc.save();

        migratedUsers++;
        totalPhotosMigrated += newPhotos.length;
        skippedPhotos += photos.length - newPhotos.length;

        console.log(`   ✅ 사용자 ${userId}: ${newPhotos.length}개 사진 마이그레이션 완료`);
        if (photos.length > MAX_PHOTOS_PER_USER) {
          console.log(`      (${photos.length - newPhotos.length}개 사진 제외됨)`);
        }
      } catch (error: any) {
        console.error(`   ❌ 사용자 ${userId} 마이그레이션 실패:`, error.message);
      }
    }

    // 5. 마이그레이션 결과 출력
    console.log('\n========================================');
    console.log('마이그레이션 완료');
    console.log('========================================');
    console.log(`성공: ${migratedUsers}명의 사용자`);
    console.log(`총 마이그레이션된 사진: ${totalPhotosMigrated}개`);
    console.log(`제외된 사진: ${skippedPhotos}개 (최대 10개 제한)`);
    console.log('========================================\n');

    // 6. 검증
    console.log('5. 마이그레이션 검증 중...');
    const newCount = await NewPassportPhotoModel.countDocuments();
    const totalPhotosInNew = await NewPassportPhotoModel.aggregate([
      { $project: { count: { $size: '$photos' } } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);

    console.log(`✅ 새 구조 문서 개수: ${newCount}개`);
    console.log(`✅ 새 구조 총 사진 개수: ${totalPhotosInNew[0]?.total || 0}개\n`);

    // 7. 연결 종료
    await connection.close();
    console.log('✅ 데이터베이스 연결 종료');

    console.log('\n⚠️  다음 단계:');
    console.log('1. 새 구조가 정상 작동하는지 테스트');
    console.log('2. 문제없으면 기존 컬렉션 백업 후 삭제');
    console.log('3. 새 컬렉션을 passportphotos로 이름 변경');

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  migrateToHybridStructure()
    .then(() => {
      console.log('\n✅ 마이그레이션 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 마이그레이션 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { migrateToHybridStructure };


