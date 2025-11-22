import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PhotoEditService } from "./photo-edit.service";
import { Response } from "express";

@Controller("photo-edit")
export class PhotoEditController {
  constructor(private readonly photoEditService: PhotoEditService) {}

  @Post()
  @UseInterceptors(FileInterceptor("image"))
  async handleImageUpload(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response
  ) {
    try {
      const editedPhoto = await this.photoEditService.getEditedPhoto(file);

      // 이미지 바이너리를 반환
      res.setHeader("Content-Type", "image/png");
      res.send(editedPhoto);
    } catch (error) {
      console.error("Error in handleImageUpload:", error.message);
      res.status(500).send({ error: "Failed to process image" });
    }
  }
}
