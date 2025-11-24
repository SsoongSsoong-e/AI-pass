import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { PhotoEditService } from "./photo-edit.service";
import { Response } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { ErrorResponseDto } from "../common/dto/error-response.dto";

@ApiTags('photo-edit')
@Controller("photo-edit")
@UseGuards(AuthenticatedGuard) // 인증 필요
export class PhotoEditController {
  constructor(
    private readonly photoEditService: PhotoEditService,
  ) {}

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
    status: 400,
    description: '이미지 파일이 필요합니다',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '이미지 파일이 필요합니다.' },
        statusCode: { type: 'number', example: 400 },
        error: { type: 'string', example: 'Bad Request' }
      },
      example: {
        message: '이미지 파일이 필요합니다.',
        statusCode: 400,
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Unauthorized' },
        statusCode: { type: 'number', example: 401 },
        error: { type: 'string', example: 'Unauthorized' }
      },
      example: {
        message: 'Unauthorized',
        statusCode: 401,
        error: 'Unauthorized'
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: '이미지 처리 실패',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Failed to process image' },
        statusCode: { type: 'number', example: 500 },
        error: { type: 'string', example: 'Internal Server Error' }
      },
      example: {
        message: 'Failed to process image',
        statusCode: 500,
        error: 'Internal Server Error'
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
