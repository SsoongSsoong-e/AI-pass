import { Module } from "@nestjs/common";
import { PhotoEditService } from "./photo-edit.service";
import { PhotoEditController } from "./photo-edit.controller";

@Module({
  providers: [PhotoEditService],
  controllers: [PhotoEditController],
})
export class EditModule {}
