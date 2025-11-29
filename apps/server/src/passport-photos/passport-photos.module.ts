import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportPhotosController } from './passport-photos.controller';
import { PassportPhotosService } from './passport-photos.service';
import { PassportPhoto, PassportPhotoSchema } from './schemas/passport-photo.schema';
import { S3Module } from '../s3/s3.module';
import { EditModule } from '../photo-edit/photo-edit.module';

/**
 * PassportPhotosModule
 * 
 * Passport Photos 관련 모듈
 * - MongoDB를 사용하여 Passport Photos 관리
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PassportPhoto.name, schema: PassportPhotoSchema },
    ]),
    S3Module,
    forwardRef(() => EditModule), // forwardRef로 순환 의존성 해결
  ],
  controllers: [PassportPhotosController],
  providers: [PassportPhotosService],
  exports: [PassportPhotosService],
})
export class PassportPhotosModule {}

