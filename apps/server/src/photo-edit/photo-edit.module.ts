import { Module } from "@nestjs/common";
import { PhotoEditService } from "./photo-edit.service";
import { PhotoEditController } from "./photo-edit.controller";
import { PassportPhotosModule } from "../passport-photos/passport-photos.module";

@Module({
  imports: [PassportPhotosModule],
  providers: [PhotoEditService],
  controllers: [PhotoEditController],
})
export class EditModule {}
