import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiCookieAuth } from '@nestjs/swagger';
import { PassportPhotosService } from './passport-photos.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';

const MAX_PHOTOS_PER_USER = 10;

/**
 * PassportPhotosController
 * 
 * Passport Photos 관련 API 엔드포인트
 * 
 * TODO: 세션 설정 완료 후 AuthenticatedGuard로 변경 예정
 */
@ApiTags('passport-photos')
@ApiCookieAuth('connect.sid')
@Controller('passport-photos')
@UseGuards(AuthGuard('session')) // 임시: 세션 설정 완료 후 변경
export class PassportPhotosController {
  constructor(
    private readonly passportPhotosService: PassportPhotosService,
  ) {}

  /**
   * 사진 추가 (FIFO 방식)
   * POST /passport-photos
   */
  @Post()
  @ApiOperation({
    summary: '여권사진 추가',
    description: `S3에 저장된 사진의 키를 입력하여 사용자의 여권사진 목록에 추가합니다.<br>최대 ${MAX_PHOTOS_PER_USER}개까지 저장 가능하며, 초과 시 FIFO 방식으로 가장 오래된 사진이 자동 삭제됩니다.`
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        s3_key: {
          type: 'string',
          example: 'photos/user123/photo_1699123456.jpg',
          description: 'S3에 저장된 파일의 키(경로)'
        }
      },
      required: ['s3_key']
    }
  })
  @ApiResponse({
    status: 201,
    description: '사진 추가 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '사진이 추가되었습니다.' },
        photo: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user_id: { type: 'number', example: 1 },
            s3_key: { type: 'string', example: 'photos/user123/photo_1699123456.jpg' },
            is_locked: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 's3_key가 필요합니다',
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async addPhoto(
    @Req() req: Request,
    @Body('s3_key') s3Key: string,
  ) {
    const user = req.user as User;
    
    if (!s3Key) {
      throw new BadRequestException('s3_key가 필요합니다.');
    }

    const photo = await this.passportPhotosService.addPhotoFIFO(
      user.id,
      s3Key,
    );

    return {
      message: '사진이 추가되었습니다.',
      photo,
    };
  }

  /**
   * 사용자별 사진 목록 조회
   * GET /passport-photos
   */
  @Get()
  @ApiOperation({
    summary: '사용자의 여권사진 목록 조회',
    description: '현재 로그인한 사용자가 저장한 모든 여권사진 목록과 통계 정보를 반환합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '사진 목록 및 통계 반환',
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              user_id: { type: 'number', example: 1 },
              s3_key: { type: 'string', example: 'photos/user123/photo_1699123456.jpg' },
              is_locked: { type: 'boolean', example: false },
              created_at: { type: 'string', format: 'date-time' },
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
  async getPhotos(@Req() req: Request) {
    const user = req.user as User;
    const photos = await this.passportPhotosService.getPhotosByUserId(user.id);
    
    const count = await this.passportPhotosService.getPhotoCount(user.id);
    
    return {
      photos,
      count: {
        total: count.total,
        locked: count.locked,
        unlocked: count.unlocked,
        maxCount: MAX_PHOTOS_PER_USER,
      },
    };
  }

  /**
   * 사진 개수 조회
   * GET /passport-photos/count
   */
  @Get('count')
  @ApiOperation({
    summary: '사진 개수 조회',
    description: '현재 로그인한 사용자의 여권사진 개수 통계를 반환합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '사진 개수 통계 반환',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 5, description: '전체 사진 개수' },
        locked: { type: 'number', example: 2, description: '잠금된 사진 개수' },
        unlocked: { type: 'number', example: 3, description: '잠금 해제된 사진 개수' },
        maxCount: { type: 'number', example: 10, description: '최대 저장 가능 개수' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async getPhotoCount(@Req() req: Request) {
    const user = req.user as User;
    const count = await this.passportPhotosService.getPhotoCount(user.id);
    
    return {
      ...count,
      maxCount: MAX_PHOTOS_PER_USER,
    };
  }

  /**
   * 잠금된 사진 목록 조회
   * GET /passport-photos/locked
   */
  @Get('locked')
  @ApiOperation({
    summary: '잠금된 사진 목록 조회',
    description: '현재 로그인한 사용자의 잠금된 여권사진 목록을 반환합니다.<br>잠금된 사진은 FIFO 삭제 대상에서 제외됩니다.'
  })
  @ApiResponse({
    status: 200,
    description: '잠금된 사진 목록 반환',
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              user_id: { type: 'number', example: 1 },
              s3_key: { type: 'string', example: 'photos/user123/photo_1699123456.jpg' },
              is_locked: { type: 'boolean', example: true },
              created_at: { type: 'string', format: 'date-time' },
            }
          }
        },
        count: { type: 'number', example: 2, description: '잠금된 사진 개수' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async getLockedPhotos(@Req() req: Request) {
    const user = req.user as User;
    const photos = await this.passportPhotosService.getLockedPhotos(user.id);
    
    return {
      photos,
      count: photos.length,
    };
  }

  /**
   * 잠금 해제된 사진 목록 조회
   * GET /passport-photos/unlocked
   */
  @Get('unlocked')
  @ApiOperation({
    summary: '잠금 해제된 사진 목록 조회',
    description: '현재 로그인한 사용자의 잠금 해제된 여권사진 목록을 반환합니다.<br>잠금 해제된 사진은 FIFO 삭제 대상입니다.'
  })
  @ApiResponse({
    status: 200,
    description: '잠금 해제된 사진 목록 반환',
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              user_id: { type: 'number', example: 1 },
              s3_key: { type: 'string', example: 'photos/user123/photo_1699123456.jpg' },
              is_locked: { type: 'boolean', example: false },
              created_at: { type: 'string', format: 'date-time' },
            }
          }
        },
        count: { type: 'number', example: 3, description: '잠금 해제된 사진 개수' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
  })
  async getUnlockedPhotos(@Req() req: Request) {
    const user = req.user as User;
    const photos = await this.passportPhotosService.getUnlockedPhotos(user.id);
    
    return {
      photos,
      count: photos.length,
    };
  }

  /**
   * 사진 잠금
   * POST /passport-photos/:s3Key/lock
   */
  @Post(':s3Key/lock')
  @ApiOperation({
    summary: '사진 잠금',
    description: '특정 사진을 잠금 처리합니다.<br>잠금된 사진은 FIFO 삭제 대상에서 제외되며, 일반 삭제도 불가능합니다.'
  })
  @ApiParam({
    name: 's3Key',
    description: '잠금할 사진의 S3 키',
    example: 'photos/user123/photo_1699123456.jpg'
  })
  @ApiResponse({
    status: 200,
    description: '사진 잠금 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '사진이 잠금되었습니다.' }
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
  async lockPhoto(
    @Req() req: Request,
    @Param('s3Key') s3Key: string,
  ) {
    const user = req.user as User;
    await this.passportPhotosService.lockPhoto(user.id, s3Key);
    
    return {
      message: '사진이 잠금되었습니다.',
    };
  }

  /**
   * 사진 잠금 해제
   * POST /passport-photos/:s3Key/unlock
   */
  @Post(':s3Key/unlock')
  @ApiOperation({
    summary: '사진 잠금 해제',
    description: '잠금된 사진의 잠금을 해제합니다.<br>잠금 해제된 사진은 다시 FIFO 삭제 대상이 됩니다.'
  })
  @ApiParam({
    name: 's3Key',
    description: '잠금 해제할 사진의 S3 키',
    example: 'photos/user123/photo_1699123456.jpg'
  })
  @ApiResponse({
    status: 200,
    description: '사진 잠금 해제 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '사진 잠금이 해제되었습니다.' }
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
  async unlockPhoto(
    @Req() req: Request,
    @Param('s3Key') s3Key: string,
  ) {
    const user = req.user as User;
    await this.passportPhotosService.unlockPhoto(user.id, s3Key);
    
    return {
      message: '사진 잠금이 해제되었습니다.',
    };
  }

  /**
   * 특정 사진 삭제 (잠금된 사진은 삭제 불가)
   * DELETE /passport-photos/:s3Key
   */
  @Delete(':s3Key')
  @ApiOperation({
    summary: '특정 사진 삭제',
    description: '지정한 S3 키의 사진을 삭제합니다.<br>잠금된 사진은 삭제할 수 없습니다.'
  })
  @ApiParam({
    name: 's3Key',
    description: '삭제할 사진의 S3 키',
    example: 'photos/user123/photo_1699123456.jpg'
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
    @Param('s3Key') s3Key: string,
  ) {
    const user = req.user as User;
    await this.passportPhotosService.deletePhoto(user.id, s3Key);
    
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

