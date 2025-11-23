import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { S3Controller } from './s3.controller';

/**
 * S3Module
 * 
 * AWS S3 관련 모듈
 * - S3Service: S3 파일 업로드/삭제, Presigned URL 생성
 * - S3Controller: 관리/디버깅용 엔드포인트 (Admin 전용)
 */
@Module({
  providers: [S3Service],
  controllers: [S3Controller],
  exports: [S3Service], // 다른 모듈에서 사용할 수 있도록 export
})
export class S3Module {}

