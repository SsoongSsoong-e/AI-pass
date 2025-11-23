import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  MethodNotAllowedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { PhotoEditService } from "./photo-edit.service";
import { Response } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";

@ApiTags('photo-edit')
@Controller("photo-edit")
@UseGuards(AuthenticatedGuard) // 인증 필요
export class PhotoEditController {
  constructor(
    private readonly photoEditService: PhotoEditService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  @ApiOperation({
    summary: '이미지 편집 (GET 요청 불가)',
    description: '이미지 편집은 POST 메서드만 지원합니다. POST /photo-edit을 사용해주세요.'
  })
  @ApiResponse({
    status: 405,
    description: 'Method Not Allowed - POST 메서드를 사용해야 합니다.'
  })
  getPhotoEdit() {
    throw new MethodNotAllowedException('이미지 편집은 POST 메서드만 지원합니다. POST /photo-edit을 사용해주세요.');
  }

  @Post()
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
