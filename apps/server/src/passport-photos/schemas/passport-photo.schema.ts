import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PassportPhotoDocument = PassportPhoto & Document;

/**
 * Presigned URL 정보 인터페이스
 */
export interface PresignedUrlInfo {
  url: string;
  expiresAt: number; // 타임스탬프 (밀리초)
}

/**
 * Photo 메타데이터 인터페이스
 */
export interface PhotoMetadata {
  photo_id: string;
  s3_key: string;
  is_locked: boolean;
  created_at: Date;
  presignedUrl?: PresignedUrlInfo; // 선택적 필드 (Presigned URL 포함 시)
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
      },
      presignedUrl: {
        type: {
          url: { type: String },
          expiresAt: { type: Number }
        },
        required: false
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

}

export const PassportPhotoSchema = SchemaFactory.createForClass(PassportPhoto);

// 인덱스 추가
PassportPhotoSchema.index({ user_id: 1 }); 
PassportPhotoSchema.index({ 'photos.created_at': -1 }); 
PassportPhotoSchema.index({ 'photos.is_locked': 1 }); 

