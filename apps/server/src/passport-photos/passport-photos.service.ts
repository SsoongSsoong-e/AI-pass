import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PassportPhoto, PassportPhotoDocument, PhotoMetadata, PhotoStats } from './schemas/passport-photo.schema';

const MAX_PHOTOS_PER_USER = 10;

/**
 * PassportPhotosService
 * 
 * Passport Photos 관련 비즈니스 로직을 처리하는 서비스
 * - 하이브리드 구조: 사용자당 하나의 문서, photos 배열로 관리
 * - FIFO 방식으로 최대 10개 사진 관리
 * - 잠금 기능으로 특정 사진 보호
 * - 통계 캐싱으로 성능 최적화
 */
@Injectable()
export class PassportPhotosService {
  constructor(
    @InjectModel(PassportPhoto.name) 
    private passportPhotoModel: Model<PassportPhotoDocument>,
  ) {}

  /**
   * 통계 재계산 (최적화: 변경된 부분만 계산)
   */
  private calculateStats(photos: PhotoMetadata[]): PhotoStats {
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

  /**
   * 사용자 문서 가져오기 또는 생성
   */
  private async getOrCreateUserDocument(userId: number): Promise<PassportPhotoDocument> {
    let userDoc = await this.passportPhotoModel.findOne({ user_id: userId });

    if (!userDoc) {
      userDoc = await this.passportPhotoModel.create({
        user_id: userId,
        photos: [],
        _stats: {
          total: 0,
          locked: 0,
          unlocked: 0,
          oldest_unlocked_index: -1,
        },
      });
    }

    return userDoc;
  }

  /**
   * FIFO 방식: 새 사진 추가 시 잠금되지 않은 오래된 사진 자동 삭제
   */
  async addPhotoFIFO(userId: number, s3Key: string): Promise<PassportPhotoDocument> {
    console.log(`[PassportPhotosService] addPhotoFIFO 시작 - userId: ${userId}, s3Key: ${s3Key}`);
    
    const userDoc = await this.getOrCreateUserDocument(userId);
    const photos = userDoc.photos || [];
    
    console.log(`[PassportPhotosService] 현재 사진 개수: ${photos.length}`);

    // 새 사진 메타데이터 생성
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPhoto: PhotoMetadata = {
      photo_id: photoId,
      s3_key: s3Key,
      is_locked: false,
      created_at: new Date(),
    };

    // 10개 미만이면 그냥 추가
    if (photos.length < MAX_PHOTOS_PER_USER) {
      console.log(`[PassportPhotosService] 새 사진 생성 중...`);
      photos.push(newPhoto);
      
      // 통계 업데이트
      userDoc._stats = this.calculateStats(photos);
      userDoc.photos = photos;
      await userDoc.save();
      
      console.log(`[PassportPhotosService] 새 사진 생성 완료 - photoId: ${photoId}`);
      return userDoc;
    }

    // 10개 이상이면 가장 오래된 잠금 해제 사진 찾기
    const oldestIndex = userDoc._stats.oldest_unlocked_index;
    
    if (oldestIndex === -1 || oldestIndex >= photos.length) {
      // 모든 사진이 잠겨있거나 인덱스가 유효하지 않으면 통계 재계산
      userDoc._stats = this.calculateStats(photos);
      
      if (userDoc._stats.oldest_unlocked_index === -1) {
        throw new BadRequestException(
          '모든 사진이 잠겨있어 새 사진을 추가할 수 없습니다. ' +
          '먼저 일부 사진의 잠금을 해제해주세요.'
        );
      }
    }

    const oldestUnlockedIndex = userDoc._stats.oldest_unlocked_index;
    const oldestPhoto = photos[oldestUnlockedIndex];

    console.log(`[PassportPhotosService] 새 사진 생성 중 (FIFO)...`);
    console.log(`[PassportPhotosService] 오래된 사진 삭제 중 - photoId: ${oldestPhoto.photo_id}`);

    // Shift 최적화: 마지막 요소와 교체 후 pop (O(1))
    if (oldestUnlockedIndex < photos.length - 1) {
      [photos[oldestUnlockedIndex], photos[photos.length - 1]] = 
        [photos[photos.length - 1], photos[oldestUnlockedIndex]];
    }
    photos.pop(); // 마지막 요소 삭제 (O(1))

    // 새 사진 추가
    photos.push(newPhoto);

    // 통계 업데이트
    userDoc._stats = this.calculateStats(photos);
    userDoc.photos = photos;
    await userDoc.save();

    console.log(`[PassportPhotosService] 새 사진 생성 완료 - photoId: ${photoId}`);
    
    // TODO: S3에서도 삭제 (S3Service 구현 후 추가)
    // await this.s3Service.deleteObject(oldestPhoto.s3_key).catch((err) => {
    //   console.error(`S3 삭제 실패: ${oldestPhoto.s3_key}`, err);
    // });

    return userDoc;
  }

  /**
   * 사용자별 사진 목록 조회 (최신순, 잠금 상태 포함)
   */
  async getPhotosByUserId(userId: number): Promise<PhotoMetadata[]> {
    const userDoc = await this.passportPhotoModel.findOne({ user_id: userId });
    
    if (!userDoc || !userDoc.photos) {
      return [];
    }

    // 최신순 정렬 (created_at 내림차순)
    return userDoc.photos
      .slice()
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, MAX_PHOTOS_PER_USER);
  }

  /**
   * 사용자별 사진 개수 확인
   */
  async getPhotoCount(userId: number): Promise<{
    total: number;
    locked: number;
    unlocked: number;
  }> {
    const userDoc = await this.passportPhotoModel.findOne({ user_id: userId });
    
    if (!userDoc || !userDoc._stats) {
      return {
        total: 0,
        locked: 0,
        unlocked: 0,
      };
    }

    return {
      total: userDoc._stats.total,
      locked: userDoc._stats.locked,
      unlocked: userDoc._stats.unlocked,
    };
  }

  /**
   * 사진 잠금
   */
  async lockPhoto(userId: number, s3Key: string): Promise<void> {
    const userDoc = await this.passportPhotoModel.findOne({ user_id: userId });

    if (!userDoc || !userDoc.photos) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    const photoIndex = userDoc.photos.findIndex(p => p.s3_key === s3Key);

    if (photoIndex === -1) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    if (userDoc.photos[photoIndex].is_locked) {
      throw new BadRequestException('이미 잠겨있는 사진입니다.');
    }

    // 잠금 업데이트
    userDoc.photos[photoIndex].is_locked = true;
    
    // 통계 업데이트
    userDoc._stats = this.calculateStats(userDoc.photos);
    await userDoc.save();
  }

  /**
   * 사진 잠금 해제
   */
  async unlockPhoto(userId: number, s3Key: string): Promise<void> {
    const userDoc = await this.passportPhotoModel.findOne({ user_id: userId });

    if (!userDoc || !userDoc.photos) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    const photoIndex = userDoc.photos.findIndex(p => p.s3_key === s3Key);

    if (photoIndex === -1) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    if (!userDoc.photos[photoIndex].is_locked) {
      throw new BadRequestException('잠겨있지 않은 사진입니다.');
    }

    // 잠금 해제
    userDoc.photos[photoIndex].is_locked = false;
    
    // 통계 업데이트
    userDoc._stats = this.calculateStats(userDoc.photos);
    await userDoc.save();
  }

  /**
   * 특정 사진 삭제 (잠금된 사진은 삭제 불가)
   */
  async deletePhoto(userId: number, s3Key: string): Promise<void> {
    const userDoc = await this.passportPhotoModel.findOne({ user_id: userId });

    if (!userDoc || !userDoc.photos) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    const photoIndex = userDoc.photos.findIndex(p => p.s3_key === s3Key);

    if (photoIndex === -1) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    // 잠금된 사진은 삭제 불가
    if (userDoc.photos[photoIndex].is_locked) {
      throw new BadRequestException(
        '잠겨있는 사진은 삭제할 수 없습니다. 먼저 잠금을 해제해주세요.'
      );
    }

    const photoToDelete = userDoc.photos[photoIndex];

    // Shift 최적화: 마지막 요소와 교체 후 pop (O(1))
    if (photoIndex < userDoc.photos.length - 1) {
      [userDoc.photos[photoIndex], userDoc.photos[userDoc.photos.length - 1]] = 
        [userDoc.photos[userDoc.photos.length - 1], userDoc.photos[photoIndex]];
    }
    userDoc.photos.pop();

    // 통계 업데이트
    userDoc._stats = this.calculateStats(userDoc.photos);
    await userDoc.save();

    // TODO: S3에서도 삭제 (S3Service 구현 후 추가)
    // await this.s3Service.deleteObject(photoToDelete.s3_key);
  }

  /**
   * 사용자별 모든 사진 삭제 (잠금된 사진은 제외)
   */
  async deleteAllPhotos(userId: number, force: boolean = false): Promise<{
    deleted: number;
    skipped: number;
  }> {
    const userDoc = await this.passportPhotoModel.findOne({ user_id: userId });

    if (!userDoc || !userDoc.photos) {
      return {
        deleted: 0,
        skipped: 0,
      };
    }

    const photosToDelete: PhotoMetadata[] = [];
    const photosToKeep: PhotoMetadata[] = [];

    for (const photo of userDoc.photos) {
      if (force || !photo.is_locked) {
        photosToDelete.push(photo);
      } else {
        photosToKeep.push(photo);
      }
    }

    const deletedCount = photosToDelete.length;
    const skippedCount = photosToKeep.length;

    // 사진 배열 업데이트
    userDoc.photos = photosToKeep;
    
    // 통계 업데이트
    userDoc._stats = this.calculateStats(userDoc.photos);
    await userDoc.save();

    // TODO: S3에서도 삭제 (S3Service 구현 후 추가)
    // for (const photo of photosToDelete) {
    //   try {
    //     await this.s3Service.deleteObject(photo.s3_key);
    //   } catch (err) {
    //     console.error(`S3 삭제 실패: ${photo.s3_key}`, err);
    //   }
    // }

    return {
      deleted: deletedCount,
      skipped: skippedCount,
    };
  }

  /**
   * 잠금된 사진 목록 조회
   */
  async getLockedPhotos(userId: number): Promise<PhotoMetadata[]> {
    const userDoc = await this.passportPhotoModel.findOne({ user_id: userId });
    
    if (!userDoc || !userDoc.photos) {
      return [];
    }

    return userDoc.photos
      .filter(p => p.is_locked)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  /**
   * 잠금 해제된 사진 목록 조회
   */
  async getUnlockedPhotos(userId: number): Promise<PhotoMetadata[]> {
    const userDoc = await this.passportPhotoModel.findOne({ user_id: userId });
    
    if (!userDoc || !userDoc.photos) {
      return [];
    }

    return userDoc.photos
      .filter(p => !p.is_locked)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }
}
