import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PassportPhotoDocument = PassportPhoto & Document;

/**
 * Photo 메타데이터 인터페이스
 */
export interface PhotoMetadata {
  photo_id: string;
  s3_key: string;
  is_locked: boolean;
  created_at: Date;
}

/**
 * 통계 캐시 인터페이스
 */
export interface PhotoStats {
  total: number;
  locked: number;
  unlocked: number;
  oldest_unlocked_index: number; // 배열 인덱스, -1이면 없음
}

/**
 * PassportPhoto Schema (MongoDB) - 하이브리드 구조 (배열 + 메타데이터)
 * 
 * 사용자당 하나의 문서로 관리하며, photos 배열에 사진 메타데이터 저장
 * 실제 이미지 파일은 S3에 저장되고, 여기서는 메타데이터만 관리
 * 
 * 설계 원칙:
 * - PostgreSQL users.id를 참조 (user_id)
 * - 사용자당 하나의 문서 (1:1)
 * - photos 배열에 최대 10개 제한 (애플리케이션 레벨에서 관리)
 * - FIFO 방식으로 오래된 사진 자동 삭제
 * - 잠금 기능으로 특정 사진 보호
 * - 통계 캐싱으로 조회 성능 최적화
 */
@Schema({ 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
})
export class PassportPhoto {
  /**
   * PostgreSQL users.id 참조
   * 관계형 데이터베이스와의 연결점
   * unique: true로 사용자당 하나의 문서만 존재
   */
  @Prop({ required: true, index: true, unique: true })
  user_id: number;

  /**
   * 사진 메타데이터 배열
   * 각 요소는 하나의 사진 정보를 담음
   */
  @Prop({
    type: [{
      photo_id: { 
        type: String, 
        required: true 
      },
      s3_key: { 
        type: String, 
        required: true 
      },
      is_locked: { 
        type: Boolean, 
        default: false 
      },
      created_at: { 
        type: Date, 
        default: Date.now 
      }
    }],
    default: []
  })
  photos: PhotoMetadata[];

  /**
   * 통계 캐시 (성능 최적화)
   * 조회 시 매번 계산하지 않고 캐시된 값 사용
   */
  @Prop({
    type: {
      total: { type: Number, default: 0 },
      locked: { type: Number, default: 0 },
      unlocked: { type: Number, default: 0 },
      oldest_unlocked_index: { type: Number, default: -1 } // 배열 인덱스
    },
    default: { total: 0, locked: 0, unlocked: 0, oldest_unlocked_index: -1 }
  })
  _stats: PhotoStats;

  // timestamps 옵션으로 자동 생성됨
  // created_at: Date; (자동 생성)
  // updated_at: Date; (자동 생성)
}

export const PassportPhotoSchema = SchemaFactory.createForClass(PassportPhoto);

// 인덱스 추가
PassportPhotoSchema.index({ user_id: 1 }); // 사용자별 조회 최적화
PassportPhotoSchema.index({ 'photos.created_at': -1 }); // 사진별 최신순 조회 최적화
PassportPhotoSchema.index({ 'photos.is_locked': 1 }); // 잠금 상태 조회 최적화

