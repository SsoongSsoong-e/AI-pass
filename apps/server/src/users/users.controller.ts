import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthenticatedGuard, AdminGuard) // Admin만 접근 가능
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public() // 회원가입은 인증 없이 접근 가능
  @ApiOperation({
    summary: '새 사용자 생성',
    description: '이메일과 사용자명을 입력하여 새로운 사용자를 생성합니다.<br>이메일은 고유해야 합니다.'
  })
  @ApiBody({
    type: CreateUserDto,
    description: '생성할 사용자 정보'
  })
  @ApiResponse({
    status: 201,
    description: '사용자 생성 성공',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        email: { type: 'string', example: 'user@example.com' },
        username: { type: 'string', example: 'testuser' },
        profile_picture: { type: 'string', nullable: true },
        role: { type: 'string', example: 'USER' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: '이미 존재하는 이메일',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: '이미 존재하는 이메일입니다' },
        error: { type: 'string', example: 'Conflict' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '유효성 검사 실패',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: '전체 사용자 목록 조회',
    description: '등록된 모든 사용자의 목록을 반환합니다.'
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
          profile_picture: { type: 'string', nullable: true },
          role: { type: 'string', example: 'USER' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        }
      }
    }
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: '특정 사용자 정보 조회',
    description: '사용자 ID를 입력하여 해당 사용자의 상세 정보를 조회합니다.'
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
        profile_picture: { type: 'string', nullable: true },
        role: { type: 'string', example: 'USER' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User #1 not found' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '사용자 정보 수정',
    description: '사용자 ID를 지정하여 사용자 정보를 부분적으로 수정합니다.'
  })
  @ApiParam({
    name: 'id',
    description: '수정할 사용자 ID',
    type: Number,
    example: 1
  })
  @ApiBody({
    type: UpdateUserDto,
    description: '수정할 사용자 정보 (부분 업데이트 가능)'
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 수정 성공',
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '사용자 삭제',
    description: '사용자 ID를 지정하여 해당 사용자를 삭제합니다.'
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
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
