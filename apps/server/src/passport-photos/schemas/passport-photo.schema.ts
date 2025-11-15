import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PassportPhotoDocument = PassportPhoto & Document;

/**
 * PassportPhoto Schema (MongoDB)
 * 
 * 사용자가 업로드한 여권사진의 메타데이터를 저장하는 컬렉션
 * 실제 이미지 파일은 S3에 저장되고, 여기서는 메타데이터만 관리
 * 
 * 설계 원칙:
 * - PostgreSQL users.id를 참조 (user_id)
 * - 최대 10개 제한 (애플리케이션 레벨에서 관리)
 * - FIFO 방식으로 오래된 사진 자동 삭제
 * - 잠금 기능으로 특정 사진 보호
 */
@Schema({ timestamps: true })
export class PassportPhoto {
  /**
   * PostgreSQL users.id 참조
   * 관계형 데이터베이스와의 연결점
   */
  @Prop({ required: true, index: true })
  user_id: number;

  /**
   * S3에 저장된 파일의 키 (경로)
   * 예: "users/999/passport_1699123456.jpg"
   * 이 키로 Presigned URL 생성 가능
   */
  @Prop({ required: true })
  s3_key: string;

  /**
   * 사진 생성 일시
   */
  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  /**
   * 잠금 여부
   * true: FIFO 삭제 대상에서 제외
   * false: FIFO 삭제 대상
   */
  @Prop({ type: Boolean, default: false })
  is_locked: boolean;
}

export const PassportPhotoSchema = SchemaFactory.createForClass(PassportPhoto);

// 인덱스 추가
PassportPhotoSchema.index({ user_id: 1, created_at: -1 }); // 사용자별 최신순 조회 최적화
PassportPhotoSchema.index({ user_id: 1, is_locked: 1 }); // 사용자별 잠금 상태 조회 최적화
PassportPhotoSchema.index({ user_id: 1, is_locked: 1, created_at: 1 }); // FIFO 조회 최적화

