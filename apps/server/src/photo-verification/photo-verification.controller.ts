
import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
//import { FileInterceptor } from '@nestjs/platform-express';
import { VerificationService } from "./photo-verification.service";

@ApiTags('verification')
@Controller("verification")
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  @ApiOperation({
    summary: '사진 검증',
    description: 'Base64 형식의 이미지 데이터를 입력받아 여권사진 규격에 맞는지 검증합니다.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'byte',
          description: 'Base64 인코딩된 이미지 데이터 (Data URI 형식 지원)',
          example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
        }
      },
      required: ['image']
    }
  })
  @ApiResponse({
    status: 200,
    description: '검증 결과 반환',
    schema: {
      type: 'object',
      properties: {
        // VerificationService의 반환값에 따라 스키마 작성 필요
        isValid: { type: 'boolean', example: true },
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '이미지 데이터가 필요합니다',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Image data is required' }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: '검증 처리 실패',
  })
  async handleImageUpload(@Body("image") image: string) {
    if (!image) {
      throw new Error("Image data is required");
    }
    // Base64 문자열에서 데이터만 추출 (Data URI 형식일 경우)
    const base64Data = image.split(",")[1];
    return this.verificationService.getVerification(base64Data);
  }
}
