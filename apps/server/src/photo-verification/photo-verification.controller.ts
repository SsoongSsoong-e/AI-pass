
import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
//import { FileInterceptor } from '@nestjs/platform-express';
import { VerificationService } from "./photo-verification.service";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { ErrorResponseDto } from "../common/dto/error-response.dto";

@ApiTags('verification')
@Controller("verification")
@UseGuards(AuthenticatedGuard) // 인증 필요
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
        tempVerificationResult: {
          type: 'array',
          items: { type: 'number' },
          description: '검증 결과 배열 [YOLO결과, 얼굴밝기+눈썹, 얼굴정면, 표정, 얼굴밝기]',
          example: [1, 1, 1, 1, 1]
        }
      },
      example: {
        tempVerificationResult: [1, 1, 1, 1, 1]
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '이미지 데이터가 필요합니다',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Image data is required' },
        statusCode: { type: 'number', example: 400 },
        error: { type: 'string', example: 'Bad Request' }
      },
      example: {
        message: 'Image data is required',
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
    description: '검증 처리 실패',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Model inference failed' },
        statusCode: { type: 'number', example: 500 },
        error: { type: 'string', example: 'Internal Server Error' }
      },
      example: {
        message: 'Model inference failed',
        statusCode: 500,
        error: 'Internal Server Error'
      }
    }
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
