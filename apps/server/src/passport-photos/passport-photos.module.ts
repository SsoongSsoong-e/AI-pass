import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportPhotosController } from './passport-photos.controller';
import { PassportPhotosService } from './passport-photos.service';
import { PassportPhoto, PassportPhotoSchema } from './schemas/passport-photo.schema';

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
  ],
  controllers: [PassportPhotosController],
  providers: [PassportPhotosService],
  exports: [PassportPhotosService],
})
export class PassportPhotosModule {}

