import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBody, ApiCookieAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * S3Controller
 * 
 * S3 관리 및 디버깅용 컨트롤러
 * - Admin만 접근 가능
 * - 실제 사용은 PassportPhotosController에서 S3Service를 주입받아 사용
 */
@ApiTags('s3')
@ApiCookieAuth('connect.sid')
@Controller('s3')
@UseGuards(AuthenticatedGuard, AdminGuard) // Admin만 접근 가능
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  /**
   * S3 연결 상태 확인
   * GET /s3/health
   */
  @Get('health')
  @ApiOperation({
    summary: 'S3 연결 상태 확인',
    description: '배포 후 S3 설정이 올바른지 확인하고, 버킷 접근 권한을 검증합니다.'
  })
  @ApiResponse({
    status: 200,
    description: 'S3 연결 상태 반환',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        bucket: { type: 'string', example: 'my-bucket' },
        region: { type: 'string', example: 'ap-northeast-2' },
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Admin 권한이 필요합니다',
  })
  async getHealth() {
    const healthStatus = await this.s3Service.checkHealth();
    
    return {
      ...healthStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 버킷 정보 조회
   * GET /s3/bucket-info
   */
  @Get('bucket-info')
  @ApiOperation({
    summary: '버킷 정보 조회',
    description: '환경 변수로 설정된 버킷 이름과 리전 정보를 반환합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '버킷 정보 반환',
    schema: {
      type: 'object',
      properties: {
        bucket: { type: 'string', example: 'my-bucket' },
        region: { type: 'string', example: 'ap-northeast-2' },
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Admin 권한이 필요합니다',
  })
  async getBucketInfo() {
    return {
      bucket: this.s3Service.getBucketName(),
      region: this.s3Service.getRegion(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 테스트 파일 업로드
   * POST /s3/test-upload
   */
  @Post('test-upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '테스트 파일 업로드',
    description: 'S3 업로드 기능을 테스트합니다. (개발/프로덕션 모두 사용 가능)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '업로드할 테스트 파일'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 200,
    description: '업로드 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '업로드 성공' },
        key: { type: 'string', example: 'passport-photos/2024/01/uuid.png' },
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Admin 권한이 필요합니다',
  })
  async testUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('파일이 필요합니다.');
    }

    // UUID 기반 키 생성
    const key = await this.s3Service.generateUniqueS3Key();

    // S3 업로드
    await this.s3Service.uploadObject(file.buffer, key, file.mimetype || 'application/octet-stream');

    return {
      message: '업로드 성공',
      key,
    };
  }

  /**
   * 테스트 파일 삭제
   * DELETE /s3/test/:key
   */
  @Delete('test/:key')
  @ApiOperation({
    summary: '테스트 파일 삭제',
    description: 'S3 삭제 기능을 테스트합니다. (개발/프로덕션 모두 사용 가능)'
  })
  @ApiParam({
    name: 'key',
    description: '삭제할 파일의 S3 키',
    example: 'passport-photos/2024/01/uuid.png'
  })
  @ApiResponse({
    status: 200,
    description: '삭제 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '삭제 성공' },
        key: { type: 'string', example: 'passport-photos/2024/01/uuid.png' },
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Admin 권한이 필요합니다',
  })
  async testDelete(@Param('key') key: string) {
    // URL 디코딩 (경로에 특수문자가 포함될 수 있음)
    const decodedKey = decodeURIComponent(key);

    // S3 삭제
    await this.s3Service.deleteObject(decodedKey);

    return {
      message: '삭제 성공',
      key: decodedKey,
    };
  }
}

