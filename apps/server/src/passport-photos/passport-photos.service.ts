import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PassportPhoto, PassportPhotoDocument } from './schemas/passport-photo.schema';

const MAX_PHOTOS_PER_USER = 10;

/**
 * PassportPhotosService
 * 
 * Passport Photos 관련 비즈니스 로직을 처리하는 서비스
 * - FIFO 방식으로 최대 10개 사진 관리
 * - 잠금 기능으로 특정 사진 보호
 */
@Injectable()
export class PassportPhotosService {
  constructor(
    @InjectModel(PassportPhoto.name) 
    private passportPhotoModel: Model<PassportPhotoDocument>,
  ) {}

  /**
   * FIFO 방식: 새 사진 추가 시 잠금되지 않은 오래된 사진 자동 삭제
   */
  async addPhotoFIFO(userId: number, s3Key: string): Promise<PassportPhotoDocument> {
    console.log(`[PassportPhotosService] addPhotoFIFO 시작 - userId: ${userId}, s3Key: ${s3Key}`);
    
    // 현재 사진 개수 확인
    const currentCount = await this.passportPhotoModel.countDocuments({
      user_id: userId,
    });
    
    console.log(`[PassportPhotosService] 현재 사진 개수: ${currentCount}`);
    
    // 10개 미만이면 그냥 추가
    if (currentCount < MAX_PHOTOS_PER_USER) {
      console.log(`[PassportPhotosService] 새 사진 생성 중...`);
      const newPhoto = await this.passportPhotoModel.create({
        user_id: userId,
        s3_key: s3Key,
        is_locked: false,
      });
      console.log(`[PassportPhotosService] 새 사진 생성 완료 - photoId: ${newPhoto._id}`);
      return newPhoto;
    }

    // 10개 이상이면 잠금되지 않은 오래된 사진 찾기
    const oldestUnlocked = await this.passportPhotoModel
      .findOne({
        user_id: userId,
        is_locked: false,
      })
      .sort({ created_at: 1 }); // 오래된 순

    // 서비스 단에서 비즈니스 로직적인 에러를 처리할 때, 동작이 되면 안되는 에러들은 클라이언트 단으로 처리를 넘김 - 200 성공으로 뱉고, 메시지 안에 에러를 넘김
    if (!oldestUnlocked) {
      // 모든 사진이 잠겨있으면 에러
      throw new BadRequestException(
        '모든 사진이 잠겨있어 새 사진을 추가할 수 없습니다. ' +
        '먼저 일부 사진의 잠금을 해제해주세요.'
      );
    }

    // 새 사진 추가
    console.log(`[PassportPhotosService] 새 사진 생성 중 (FIFO)...`);
    const newPhoto = await this.passportPhotoModel.create({
      user_id: userId,
      s3_key: s3Key,
      is_locked: false,
    });
    console.log(`[PassportPhotosService] 새 사진 생성 완료 - photoId: ${newPhoto._id}`);

    // 오래된 사진 삭제
    console.log(`[PassportPhotosService] 오래된 사진 삭제 중 - photoId: ${oldestUnlocked._id}`);
    await this.passportPhotoModel.deleteOne({ _id: oldestUnlocked._id });
    console.log(`[PassportPhotosService] 오래된 사진 삭제 완료`);
    
    // TODO: S3에서도 삭제 (S3Service 구현 후 추가)
    // await this.s3Service.deleteObject(oldestUnlocked.s3_key).catch((err) => {
    //   console.error(`S3 삭제 실패: ${oldestUnlocked.s3_key}`, err);
    // });

    return newPhoto;
  }

  /**
   * 사용자별 사진 목록 조회 (최신순, 잠금 상태 포함)
   */
  async getPhotosByUserId(userId: number): Promise<PassportPhoto[]> {
    return await this.passportPhotoModel
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(MAX_PHOTOS_PER_USER)
      .exec();
  }

  /**
   * 사용자별 사진 개수 확인
   */
  async getPhotoCount(userId: number): Promise<{
    total: number;
    locked: number;
    unlocked: number;
  }> {
    const [total, locked] = await Promise.all([
      this.passportPhotoModel.countDocuments({ user_id: userId }),
      this.passportPhotoModel.countDocuments({
        user_id: userId,
        is_locked: true
      }),
    ]);

    return {
      total,
      locked,
      unlocked: total - locked,
    };
  }

  /**
   * 사진 잠금
   */
  async lockPhoto(userId: number, s3Key: string): Promise<void> {
    const photo = await this.passportPhotoModel.findOne({
      user_id: userId,
      s3_key: s3Key,
    });

    if (!photo) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    if (photo.is_locked) {
      throw new BadRequestException('이미 잠겨있는 사진입니다.');
    }

    photo.is_locked = true;
    await photo.save();
  }

  /**
   * 사진 잠금 해제
   */
  async unlockPhoto(userId: number, s3Key: string): Promise<void> {
    const photo = await this.passportPhotoModel.findOne({
      user_id: userId,
      s3_key: s3Key,
    });

    if (!photo) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    if (!photo.is_locked) {
      throw new BadRequestException('잠겨있지 않은 사진입니다.');
    }

    photo.is_locked = false;
    await photo.save();
  }

  /**
   * 특정 사진 삭제 (잠금된 사진은 삭제 불가)
   */
  async deletePhoto(userId: number, s3Key: string): Promise<void> {
    const photo = await this.passportPhotoModel.findOne({
      user_id: userId,
      s3_key: s3Key,
    });

    if (!photo) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    // 잠금된 사진은 삭제 불가
    if (photo.is_locked) {
      throw new BadRequestException(
        '잠겨있는 사진은 삭제할 수 없습니다. 먼저 잠금을 해제해주세요.'
      );
    }

    // MongoDB에서 삭제
    await this.passportPhotoModel.deleteOne({ _id: photo._id });

    // TODO: S3에서도 삭제 (S3Service 구현 후 추가)
    // await this.s3Service.deleteObject(photo.s3_key);
  }

  /**
   * 사용자별 모든 사진 삭제 (잠금된 사진은 제외)
   */
  async deleteAllPhotos(userId: number, force: boolean = false): Promise<{
    deleted: number;
    skipped: number;
  }> {
    const query = force
      ? { user_id: userId } // 강제 삭제: 모든 사진
      : { user_id: userId, is_locked: false }; // 일반 삭제: 잠금 해제된 사진만

    const photosToDelete = await this.passportPhotoModel.find(query);
    const deletedCount = photosToDelete.length;

    // MongoDB에서 삭제
    await this.passportPhotoModel.deleteMany(query);

    // TODO: S3에서도 삭제 (S3Service 구현 후 추가)
    // let s3DeletedCount = 0;
    // for (const photo of photosToDelete) {
    //   try {
    //     await this.s3Service.deleteObject(photo.s3_key);
    //     s3DeletedCount++;
    //   } catch (err) {
    //     console.error(`S3 삭제 실패: ${photo.s3_key}`, err);
    //   }
    // }

    const skipped = force
      ? 0
      : await this.passportPhotoModel.countDocuments({
          user_id: userId,
          is_locked: true,
        });

    return {
      deleted: deletedCount,
      skipped,
    };
  }

  /**
   * 잠금된 사진 목록 조회
   */
  async getLockedPhotos(userId: number): Promise<PassportPhoto[]> {
    return await this.passportPhotoModel
      .find({
        user_id: userId,
        is_locked: true,
      })
      .sort({ created_at: -1 })
      .exec();
  }

  /**
   * 잠금 해제된 사진 목록 조회
   */
  async getUnlockedPhotos(userId: number): Promise<PassportPhoto[]> {
    return await this.passportPhotoModel
      .find({
        user_id: userId,
        is_locked: false,
      })
      .sort({ created_at: -1 })
      .exec();
  }
}

