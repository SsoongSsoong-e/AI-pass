import { Controller, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthenticatedGuard, AdminGuard) // Admin만 접근 가능
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: '전체 사용자 목록 조회 (관리자 기능)',
    description: '관리자 전용: 등록된 모든 사용자의 목록을 반환합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '사용자 목록 반환',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          email: { type: 'string', example: 'user@example.com' },
          username: { type: 'string', example: 'testuser' },
          profile_picture: { 
            type: 'string', 
            nullable: true,
            example: 'https://lh3.googleusercontent.com/a/default-user'
          },
          role: { type: 'string', example: 'USER' },
          created_at: { 
            type: 'string', 
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          },
          updated_at: { 
            type: 'string', 
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          },
        }
      },
      example: [
        {
          id: 1,
          email: 'user@example.com',
          username: 'testuser',
          profile_picture: 'https://lh3.googleusercontent.com/a/default-user',
          role: 'USER',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]
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
    status: 403,
    description: '관리자 권한이 필요합니다',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Forbidden resource' },
        statusCode: { type: 'number', example: 403 },
        error: { type: 'string', example: 'Forbidden' }
      },
      example: {
        message: 'Forbidden resource',
        statusCode: 403,
        error: 'Forbidden'
      }
    }
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: '특정 사용자 정보 조회 (관리자 기능)',
    description: '관리자 전용: 사용자 ID를 입력하여 해당 사용자의 상세 정보를 조회합니다.'
  })
  @ApiParam({
    name: 'id',
    description: '조회할 사용자 ID',
    type: Number,
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 반환',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        email: { type: 'string', example: 'user@example.com' },
        username: { type: 'string', example: 'testuser' },
        profile_picture: { 
          type: 'string', 
          nullable: true,
          example: 'https://lh3.googleusercontent.com/a/default-user'
        },
        role: { type: 'string', example: 'USER' },
        created_at: { 
          type: 'string', 
          format: 'date-time',
          example: '2024-01-01T00:00:00.000Z'
        },
        updated_at: { 
          type: 'string', 
          format: 'date-time',
          example: '2024-01-01T00:00:00.000Z'
        },
      },
      example: {
        id: 1,
        email: 'user@example.com',
        username: 'testuser',
        profile_picture: 'https://lh3.googleusercontent.com/a/default-user',
        role: 'USER',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User #1 not found' },
        error: { type: 'string', example: 'Not Found' }
      },
      example: {
        statusCode: 404,
        message: 'User #1 not found',
        error: 'Not Found'
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
    status: 403,
    description: '관리자 권한이 필요합니다',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Forbidden resource' },
        statusCode: { type: 'number', example: 403 },
        error: { type: 'string', example: 'Forbidden' }
      },
      example: {
        message: 'Forbidden resource',
        statusCode: 403,
        error: 'Forbidden'
      }
    }
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '사용자 삭제 (관리자 기능)',
    description: '관리자 전용: 사용자 ID를 지정하여 해당 사용자를 삭제합니다.'
  })
  @ApiParam({
    name: 'id',
    description: '삭제할 사용자 ID',
    type: Number,
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: '사용자 삭제 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User deleted successfully' }
      },
      example: {
        message: 'User deleted successfully'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User #1 not found' },
        error: { type: 'string', example: 'Not Found' }
      },
      example: {
        statusCode: 404,
        message: 'User #1 not found',
        error: 'Not Found'
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
    status: 403,
    description: '관리자 권한이 필요합니다',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Forbidden resource' },
        statusCode: { type: 'number', example: 403 },
        error: { type: 'string', example: 'Forbidden' }
      },
      example: {
        message: 'Forbidden resource',
        statusCode: 403,
        error: 'Forbidden'
      }
    }
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
