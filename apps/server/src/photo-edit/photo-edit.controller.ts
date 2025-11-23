import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { PhotoEditService } from "./photo-edit.service";
import { Response } from "express";
// 임시: 인증 관련 import 제거 (나중에 로그인 기능 추가 시 다시 추가)
// import { Public } from "../auth/decorators/public.decorator";
// import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";

@ApiTags('photo-edit')
@Controller("photo-edit")
// 임시: 가드 없이 사용 (나중에 로그인 기능 추가 시 @UseGuards(AuthenticatedGuard) 추가)
export class PhotoEditController {
  constructor(
    private readonly photoEditService: PhotoEditService,
  ) {}

  @Post()
  // 임시: 인증 없이 사용 가능 (나중에 로그인 기능 추가 시 @UseGuards(AuthenticatedGuard) 추가)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({
    summary: '이미지 편집',
    description: '업로드한 이미지를 여권사진 규격에 맞게 편집하여 PNG 형식의 바이너리 데이터로 반환합니다.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: '편집할 이미지 파일'
        }
      },
      required: ['image']
    }
  })
  @ApiResponse({
    status: 200,
    description: '편집된 이미지 반환 (PNG 바이너리)',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: '이미지 처리 실패',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Failed to process image' }
      }
    }
  })
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
