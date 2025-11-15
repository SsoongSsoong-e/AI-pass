import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
/**
 * AuthController
 * 
 * OAuth 인증 관련 엔드포인트
 */
@ApiTags("auth")
@Controller('auth')
export class AuthController {
  
  /**
   * Google OAuth 시작
   * 
   * GET /auth/google
   * → Google 로그인 페이지로 리다이렉트
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth 로그인 시작',
    description: `Google OAuth 인증을 시작합니다.<br>이 엔드포인트에 접근하면 Google 로그인 페이지로 리다이렉트됩니다.`
  })
  @ApiResponse({
    status: 302,
    description: 'Google 로그인 페이지로 리다이렉트',
  })
  async googleAuth() {
    // Passport가 자동으로 Google 로그인 페이지로 리다이렉트
  }


  /**
   * Google OAuth 콜백
   * 
   * GET /auth/google/callback
   * → Google 인증 완료 후 리다이렉트되는 엔드포인트
   * → 세션 생성 후 프론트엔드로 리다이렉트
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth 콜백',
    description: `Google 인증 완료 후 리다이렉트되는 엔드포인트입니다.<br>세션이 생성되고 사용자 정보가 반환됩니다.`
  })
  @ApiResponse({
    status: 200,
    description: '인증 성공 및 사용자 정보 반환',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Google OAuth 인증 완료' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', example: 'user@example.com' },
            username: { type: 'string', example: 'testuser' },
            profile_picture: { type: 'string', nullable: true, example: 'https://example.com/profile.jpg' },
            role: { type: 'string', example: 'USER' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          }
        }
      }
    }
  })
  async googleAuthRedirect(@Req() req: Request) {
    // Passport가 req.user에 User 객체를 설정함
    // 세션은 express-session이 자동으로 생성 (3단계에서 설정 예정)
    
    // TODO: 세션 설정 후 프론트엔드로 리다이렉트
    // return { user: req.user };
    return {
      message: 'Google OAuth 인증 완료',
      user: req.user,
    };
  }

  /**
   * 현재 로그인한 사용자 정보 조회
   * 
   * GET /auth/me
   * → 세션에서 사용자 정보 반환
   * 
   * 주의: 세션 설정 전까지는 임시로 구현
   */
  @Get('me')
  @ApiOperation({
    summary: '현재 로그인한 사용자 정보 조회',
    description: `세션에 저장된 현재 로그인한 사용자의 정보를 반환합니다.<br>세션이 없으면 에러를 반환합니다.`
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
    status: 401,
    description: '로그인이 필요합니다',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '로그인이 필요합니다 (세션 설정 후 구현 예정)' }
      }
    }
  })
  async getMe(@Req() req: Request): Promise<User | { message: string }> {
    // 3단계에서 세션 설정 후 AuthGuard('session') 적용 예정
    if (req.user) {
      return req.user as User;
    }
    return { message: '로그인이 필요합니다 (세션 설정 후 구현 예정)' };
  }

  /**
   * 로그아웃
   * 
   * GET /auth/logout
   * → 세션 삭제 및 로그아웃
   */
  @Get('logout')
  @ApiOperation({
    summary: '로그아웃',
    description: `현재 세션을 삭제하고 로그아웃합니다.`
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '로그아웃 (3단계에서 구현 예정)' }
      }
    }
  })
  async logout(@Req() req: Request) {
    // 3단계에서 구현 예정
    // req.logout();
    // req.session.destroy();
    return { message: '로그아웃 (3단계에서 구현 예정)' };
  }
}

