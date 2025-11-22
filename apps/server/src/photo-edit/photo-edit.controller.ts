import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { PhotoEditService } from "./photo-edit.service";
import { PassportPhotosService } from "../passport-photos/passport-photos.service";
import { PassportPhotoDocument } from "../passport-photos/schemas/passport-photo.schema";
import { Response } from "express";
import * as fs from "fs";
import * as path from "path";
// 임시: 인증 관련 import 제거 (나중에 로그인 기능 추가 시 다시 추가)
// import { Public } from "../auth/decorators/public.decorator";
// import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";

@ApiTags('photo-edit')
@Controller("photo-edit")
// 임시: 가드 없이 사용 (나중에 로그인 기능 추가 시 @UseGuards(AuthenticatedGuard) 추가)
export class PhotoEditController {
  constructor(
    private readonly photoEditService: PhotoEditService,
    private readonly passportPhotosService: PassportPhotosService,
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

  /**
   * 편집된 사진을 서버에 저장
   * POST /photo-edit/save
   * 
   * 임시: 인증 없이 작동 (테스트용)
   * TODO: 세션 인증 추가 후 수정 필요
   */
  @Post("save")
  // 임시: 인증 없이 사용 가능 (나중에 로그인 기능 추가 시 @UseGuards(AuthenticatedGuard) 추가)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({
    summary: '편집된 사진 저장',
    description: '이미지를 편집한 후 서버에 저장하고 Passport Photos 목록에 추가합니다.<br>userId가 없으면 기본 사용자(1)로 저장됩니다.'
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
        },
        userId: {
          type: 'string',
          description: '사진을 저장할 사용자 ID (선택사항, 기본값: 1)',
          example: '1'
        }
      },
      required: ['image']
    }
  })
  @ApiResponse({
    status: 200,
    description: '사진 저장 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '사진이 저장되었습니다.' },
        photo: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user_id: { type: 'number', example: 1 },
            s3_key: { type: 'string', example: 'uploads/passport-photos/photo_1699123456.png' },
            is_locked: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
          }
        },
        filePath: { type: 'string', example: 'uploads/passport-photos/photo_1699123456.png' }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: '이미지 처리 또는 저장 실패',
  })
  async savePhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body("userId") userId?: string,
  ) {
    try {
      // 1. 이미지 편집
      const editedPhoto = await this.photoEditService.getEditedPhoto(file);

      // 2. 임시로 로컬 파일 시스템에 저장 (S3 대신)
      const uploadsDir = path.join(process.cwd(), "uploads", "passport-photos");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const filename = `photo_${timestamp}.png`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, editedPhoto);

      // 3. 임시 s3_key 생성 (로컬 파일 경로)
      const s3Key = `uploads/passport-photos/${filename}`;

      // 4. Passport Photos에 저장 (임시: userId가 없으면 기본값 사용)
      const targetUserId = userId ? parseInt(userId, 10) : 1; // 임시: 기본 사용자 ID
      
      console.log(`[savePhoto] MongoDB 저장 시도 - userId: ${targetUserId}, s3Key: ${s3Key}`);
      
      try {
        const photo: PassportPhotoDocument = await this.passportPhotosService.addPhotoFIFO(
          targetUserId,
          s3Key,
        );

        console.log(`[savePhoto] MongoDB 저장 성공 - photoId: ${photo._id}, userId: ${photo.user_id}`);
        
        return {
          message: "사진이 저장되었습니다.",
          photo,
          filePath: s3Key,
        };
      } catch (error) {
        // Passport Photos 저장 실패해도 파일은 저장됨
        console.error("[savePhoto] MongoDB 저장 실패:", error.message);
        console.error("[savePhoto] 에러 상세:", error);
        return {
          message: "사진이 저장되었습니다. (Passport Photos 등록 실패)",
          filePath: s3Key,
          error: error.message,
        };
      }
    } catch (error) {
      console.error("Error in savePhoto:", error.message);
      throw error;
    }
  }
}
