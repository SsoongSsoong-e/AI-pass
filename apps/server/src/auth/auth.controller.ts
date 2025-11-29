import { Controller, Get, Delete, Req, UseGuards, Res, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { User } from '../users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from './decorators/public.decorator';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags("auth")
@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth 로그인 시작',
    description: `Google OAuth 인증을 시작합니다.<br>이 엔드포인트에 접근하면 Google 로그인 페이지로 리다이렉트됩니다.`
  })
  @ApiResponse({
    status: 302,
    description: 'Google 로그인 페이지로 리다이렉트',
  })
  async googleAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth 콜백',
    description: `Google 인증 완료 후 리다이렉트되는 엔드포인트입니다.<br>세션이 생성되고 프론트엔드로 리다이렉트됩니다.`
  })
  @ApiResponse({
    status: 302,
    description: '프론트엔드로 리다이렉트',
  })
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const sessionMaxAge = this.configService.get<number>('SESSION_MAX_AGE', 604800) * 1000;
    const isProduction = process.env.NODE_ENV === 'production';

    // Passport가 세션에 사용자를 저장하도록 req.login() 호출
    return new Promise<void>((resolve) => {
      req.login(req.user, (err) => {
        if (err) {
          console.error('로그인 세션 저장 오류:', err);
          return res.status(500).json({
            message: '로그인 세션 저장 중 오류가 발생했습니다.',
            error: err.message
          });
        }

        // 세션 저장
        req.session.save((err) => {
          if (err) {
            console.error('세션 저장 오류:', err);
            return res.status(500).json({
              message: '세션 저장 중 오류가 발생했습니다.',
              error: err.message
            });
          }

          res.cookie('connect.sid', req.sessionID, {
            maxAge: sessionMaxAge,
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
          });

          console.log('🍪 Cookie set directly:', req.sessionID);
          console.log('✅ 사용자 로그인 완료:', req.user);
          res.redirect(`${frontendUrl}/auth/callback?success=true`);
          resolve();
        });
      });
    });
  }

  @Get('session/user')
  @Public() // Public으로 변경하여 세션이 없어도 접근 가능 (랜딩 페이지에서 사용)
  @ApiOperation({
    summary: '현재 로그인한 사용자 정보 조회',
    description: `세션에 저장된 현재 로그인한 사용자의 정보를 반환합니다.<br>세션이 없으면 null을 반환합니다.`
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 반환 (세션이 없으면 null)',
    schema: {
      oneOf: [
        {
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
        },
        { type: 'null', example: null }
      ]
    }
  })
  async getSessionUser(@Req() req: Request): Promise<User | null> {
    // 세션이 없으면 null 반환 (에러가 아님)
    // 프론트엔드에서 로그인 상태를 확인하는 용도로 사용
    if (!req.user) {
      return null;
    }
    return req.user as User;
  }

  @Delete('session')
  @UseGuards(AuthenticatedGuard) // 인증 필요
  @HttpCode(HttpStatus.OK)
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
        message: { 
          type: 'string', 
          example: '로그아웃 완료' 
        }
      },
      example: {
        message: '로그아웃 완료'
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
    description: '로그아웃 처리 중 오류 발생',
    type: ErrorResponseDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '로그아웃 중 오류가 발생했습니다.' },
        statusCode: { type: 'number', example: 500 },
        error: { type: 'string', example: 'Internal Server Error' }
      },
      example: {
        message: '로그아웃 중 오류가 발생했습니다.',
        statusCode: 500,
        error: 'Internal Server Error'
      }
    }
  })
  async deleteSession(@Req() req: Request, @Res() res: Response) {
    return new Promise<void>((resolve) => {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({
            message: '로그아웃 중 오류가 발생했습니다.',
            error: err.message
          });
        }

        req.session.destroy((err) => {
          if (err) {
            return res.status(500).json({
              message: '세션 삭제 중 오류가 발생했습니다.',
              error: err.message
            });
          }

          res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });

          res.json({ message: '로그아웃 완료' });
          resolve();
        });
      });
    });
  }
}
