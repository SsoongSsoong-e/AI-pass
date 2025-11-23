import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiCookieAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PassportPhotosService } from './passport-photos.service';
import { S3Service } from '../s3/s3.service';
import { PhotoEditService } from '../photo-edit/photo-edit.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';

const MAX_PHOTOS_PER_USER = 10;

/**
 * PassportPhotosController
 * 
 * Passport Photos 관련 API 엔드포인트
 * 
 * 인증 관련:
 * - @UseGuards(AuthenticatedGuard)가 적용되어 있지만,
 *   AUTH_ENABLED 환경 변수가 false면 인증 없이 접근 가능
 * - 로그인 기능 완성 전까지는 AUTH_ENABLED=false로 설정하여 사용
 * - main branch 배포 시 AUTH_ENABLED=true로 설정하여 재활성화
 */
@ApiTags('passport-photos')
@ApiCookieAuth('connect.sid') // Swagger 문서용 (AUTH_ENABLED=false면 실제 인증은 필요 없음)
@Controller('passport-photos')
@UseGuards(AuthenticatedGuard) // AUTH_ENABLED 설정에 따라 동작
export class PassportPhotosController {
  constructor(
    private readonly passportPhotosService: PassportPhotosService,
    private readonly s3Service: S3Service,
    private readonly photoEditService: PhotoEditService,
  ) {}

  /**
   * 사진 업로드 및 저장 (FIFO 방식)
   * POST /passport-photos
   * 
   * 파일 업로드 → 편집 → S3 저장 → MongoDB 저장
   */
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: '여권사진 업로드 및 저장',
    description: `이미지를 업로드하여 여권사진 규격에 맞게 편집한 후 S3에 저장하고 목록에 추가합니다.<br>최대 ${MAX_PHOTOS_PER_USER}개까지 저장 가능하며, 초과 시 FIFO 방식으로 가장 오래된 사진이 자동 삭제됩니다.`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: '업로드할 이미지 파일'
        }
      },
      required: ['image']
    }
  })
  @ApiResponse({
    status: 201,
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
            photos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  photo_id: { type: 'string' },
                  s3_key: { type: 'string' },
                  is_locked: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                }
              }
            },
            _stats: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                locked: { type: 'number' },
                unlocked: { type: 'number' },
                oldest_unlocked_index: { type: 'number' },
              }
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          }
        },
        s3Key: { type: 'string', example: 'passport-photos/2024/01/uuid.png' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '이미지 파일이 필요합니다',
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  @ApiResponse({
    status: 500,
    description: '이미지 처리 또는 저장 실패',
  })
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    const user = req.user as User;
    let s3Key: string | null = null;

    try {
      // 1. 이미지 편집
      const editedPhoto = await this.photoEditService.getEditedPhoto(file);

      // 2. UUID 기반 S3 키 생성
      s3Key = await this.s3Service.generateUniqueS3Key();

      // 3. S3 업로드 먼저 (파일이 실제로 존재할 때만 DB 저장)
      await this.s3Service.uploadObject(editedPhoto, s3Key, 'image/png');

      // 4. MongoDB에 메타데이터 저장
      const photo = await this.passportPhotosService.addPhotoFIFO(
        user.id,
        s3Key,
      );

      return {
        message: '사진이 저장되었습니다.',
        photo,
        s3Key: s3Key,
      };
    } catch (error) {
      // DB 저장 실패 시 S3 파일 삭제 (고아 파일 방지)
      if (s3Key) {
        try {
          await this.s3Service.deleteObject(s3Key);
        } catch (deleteError) {
          console.error(`[uploadPhoto] S3 파일 삭제 실패: ${s3Key}`, deleteError);
        }
      }
      throw error;
    }
  }

  /**
   * 사용자별 사진 목록 조회 (RESTful)
   * GET /passport-photos
   * 
   * 쿼리 파라미터:
   * - includeUrls: Presigned URL 포함 여부 (true일 때만 URL 생성)
   * - include: 포함할 정보 ('count'일 때 통계 포함)
   * - filter: 필터링 옵션 ('locked' | 'unlocked')
   */
  @Get()
  @ApiOperation({
    summary: '사용자의 여권사진 목록 조회',
    description: '현재 로그인한 사용자가 저장한 모든 여권사진 목록을 반환합니다.<br>쿼리 파라미터로 필터링 및 추가 정보를 포함할 수 있습니다.'
  })
  @ApiQuery({
    name: 'includeUrls',
    required: false,
    type: String,
    description: 'Presigned URL 포함 여부 (true일 때만 URL 생성)',
    example: 'true'
  })
  @ApiQuery({
    name: 'include',
    required: false,
    type: String,
    description: '포함할 정보 (count: 통계 정보 포함)',
    example: 'count'
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    enum: ['locked', 'unlocked'],
    description: '필터링 옵션 (locked: 잠금된 사진만, unlocked: 잠금 해제된 사진만)',
    example: 'locked'
  })
  @ApiResponse({
    status: 200,
    description: '사진 목록 반환',
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              photo_id: { type: 'string' },
              s3_key: { type: 'string', example: 'passport-photos/2024/01/uuid.png' },
              is_locked: { type: 'boolean', example: false },
              created_at: { type: 'string', format: 'date-time' },
              presignedUrl: {
                type: 'object',
                properties: {
                  url: { type: 'string', example: 'https://...' },
                  expiresAt: { type: 'number', example: 1704067200000 }
                }
              }
            }
          }
        },
        count: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            locked: { type: 'number', example: 2 },
            unlocked: { type: 'number', example: 3 },
            maxCount: { type: 'number', example: 10 }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async getPhotos(
    @Req() req: Request,
    @Query('includeUrls') includeUrls?: string,
    @Query('include') include?: string,
    @Query('filter') filter?: 'locked' | 'unlocked',
  ) {
    const user = req.user as User;
    
    // 필터링 옵션 적용
    const photos = await this.passportPhotosService.getPhotosByUserId(user.id, {
      filter,
    });

    // includeUrls=true인 경우 Presigned URL 생성
    let photosWithUrls = photos;
    if (includeUrls === 'true' && photos.length > 0) {
      const keys = photos.map(photo => photo.s3_key);
      const urlMappings = await this.s3Service.generatePresignedUrls(keys, 3600);
      const urlMap = new Map(urlMappings.map(m => [m.key, m.url]));
      
      photosWithUrls = photos.map(photo => {
        const url = urlMap.get(photo.s3_key);
        if (url) {
          return {
            ...photo,
            presignedUrl: {
              url,
              expiresAt: Date.now() + 3600 * 1000,
            },
          };
        }
        return photo;
      });
    }

    // include=count인 경우 통계 정보 포함
    if (include === 'count') {
      const count = await this.passportPhotosService.getPhotoCount(user.id);
      return {
        photos: photosWithUrls,
        count: {
          total: count.total,
          locked: count.locked,
          unlocked: count.unlocked,
          maxCount: MAX_PHOTOS_PER_USER,
        },
      };
    }

    return {
      photos: photosWithUrls,
    };
  }

  /**
   * 특정 사진 조회
   * GET /passport-photos/:photoId
   */
  @Get(':photoId')
  @ApiOperation({
    summary: '특정 사진 조회',
    description: 'photo_id로 특정 사진의 정보를 조회합니다.'
  })
  @ApiParam({
    name: 'photoId',
    description: '조회할 사진의 ID',
    example: 'photo_1704067200000_abc123xyz'
  })
  @ApiQuery({
    name: 'includeUrls',
    required: false,
    type: String,
    description: 'Presigned URL 포함 여부 (true일 때만 URL 생성)',
    example: 'true'
  })
  @ApiResponse({
    status: 200,
    description: '사진 정보 반환',
    schema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string' },
        s3_key: { type: 'string' },
        is_locked: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        presignedUrl: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            expiresAt: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '사진을 찾을 수 없음',
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async getPhoto(
    @Req() req: Request,
    @Param('photoId') photoId: string,
    @Query('includeUrls') includeUrls?: string,
  ) {
    const user = req.user as User;
    const photo = await this.passportPhotosService.getPhotoById(user.id, photoId);

    if (!photo) {
      throw new BadRequestException('사진을 찾을 수 없습니다.');
    }

    // includeUrls=true인 경우 Presigned URL 생성
    if (includeUrls === 'true') {
      const url = await this.s3Service.getPresignedUrl(photo.s3_key, 3600);
      return {
        ...photo,
        presignedUrl: {
          url,
          expiresAt: Date.now() + 3600 * 1000,
        },
      };
    }

    return photo;
  }

  /**
   * 사진 수정 (잠금/잠금 해제 통합)
   * PATCH /passport-photos/:photoId
   */
  @Patch(':photoId')
  @ApiOperation({
    summary: '사진 수정',
    description: '특정 사진의 정보를 수정합니다. (현재는 잠금 상태만 수정 가능)<br>잠금된 사진은 FIFO 삭제 대상에서 제외되며, 일반 삭제도 불가능합니다.'
  })
  @ApiParam({
    name: 'photoId',
    description: '수정할 사진의 ID',
    example: 'photo_1704067200000_abc123xyz'
  })
  @ApiBody({
    type: UpdatePhotoDto,
    description: '수정할 필드 (is_locked)'
  })
  @ApiResponse({
    status: 200,
    description: '사진 수정 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '사진이 수정되었습니다.' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '사진을 찾을 수 없음',
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (이미 같은 상태)',
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async updatePhoto(
    @Req() req: Request,
    @Param('photoId') photoId: string,
    @Body() dto: UpdatePhotoDto,
  ) {
    const user = req.user as User;
    await this.passportPhotosService.updatePhoto(user.id, photoId, dto);
    
    return {
      message: '사진이 수정되었습니다.',
    };
  }

  /**
   * 특정 사진 삭제 (photo_id 기반, 잠금된 사진은 삭제 불가)
   * DELETE /passport-photos/:photoId
   */
  @Delete(':photoId')
  @ApiOperation({
    summary: '특정 사진 삭제',
    description: '지정한 photo_id의 사진을 삭제합니다.<br>잠금된 사진은 삭제할 수 없습니다.'
  })
  @ApiParam({
    name: 'photoId',
    description: '삭제할 사진의 ID',
    example: 'photo_1704067200000_abc123xyz'
  })
  @ApiResponse({
    status: 200,
    description: '사진 삭제 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '사진이 삭제되었습니다.' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: '잠금된 사진은 삭제할 수 없습니다',
  })
  @ApiResponse({
    status: 404,
    description: '사진을 찾을 수 없음',
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async deletePhoto(
    @Req() req: Request,
    @Param('photoId') photoId: string,
  ) {
    const user = req.user as User;
    await this.passportPhotosService.deletePhoto(user.id, photoId);
    
    return {
      message: '사진이 삭제되었습니다.',
    };
  }

  /**
   * 모든 사진 삭제 (잠금된 사진은 제외)
   * DELETE /passport-photos
   */
  @Delete()
  @ApiOperation({
    summary: '모든 사진 삭제',
    description: `현재 로그인한 사용자의 모든 사진을 삭제합니다.<br>잠금된 사진은 기본적으로 삭제되지 않으며, force=true 옵션으로 강제 삭제 가능합니다.`
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'true로 설정하면 잠금된 사진도 강제 삭제',
    example: false
  })
  @ApiResponse({
    status: 200,
    description: '사진 삭제 완료',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '사진이 삭제되었습니다.' },
        deleted: { type: 'number', example: 5, description: '삭제된 사진 개수' },
        skipped: { type: 'number', example: 2, description: '건너뛴 사진 개수 (잠금된 사진)' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async deleteAllPhotos(
    @Req() req: Request,
    @Query('force') force?: string,
  ) {
    const user = req.user as User;
    const result = await this.passportPhotosService.deleteAllPhotos(
      user.id,
      force === 'true', // 강제 삭제 옵션
    );
    
    return {
      message: '사진이 삭제되었습니다.',
      deleted: result.deleted,
      skipped: result.skipped,
    };
  }
}

