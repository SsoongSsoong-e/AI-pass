import { Module, forwardRef } from "@nestjs/common";
import { PhotoEditService } from "./photo-edit.service";
import { PhotoEditController } from "./photo-edit.controller";
import { PassportPhotosModule } from "../passport-photos/passport-photos.module";
import { S3Module } from "../s3/s3.module";

@Module({
  imports: [
    forwardRef(() => PassportPhotosModule), // forwardRef로 순환 의존성 해결
    S3Module,
  ],
  providers: [PhotoEditService],
  controllers: [PhotoEditController],
  exports: [PhotoEditService], // PassportPhotosModule에서 사용할 수 있도록 export
})
export class EditModule {}
