import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// @ts-ignore - passport-custom 타입 정의가 없음
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

/**
 * Session Strategy
 * 
 * 세션 기반 인증을 처리하는 Passport Strategy
 * req.user가 존재하는지 확인하여 인증 여부 판단
 * 
 * 사용법:
 * - @UseGuards(AuthGuard('session'))로 사용
 * - 세션이 있고 req.user가 존재하면 인증 성공
 */
@Injectable()
export class SessionStrategy extends PassportStrategy(Strategy, 'session') {
  /**
   * 세션 인증 검증
   * 
   * @param req Express Request 객체
   * @param done Passport 콜백 함수
   */
  async validate(req: Request, done: (error: any, user?: any) => void): Promise<void> {
    // OAuth 경로는 인증 없이 통과 (로그인 전이므로)
    const isAuthPath = req.path?.startsWith('/auth/google') || req.path === '/auth/google/callback';
    if (isAuthPath) {
      return done(null, req.user as User | undefined || null);
    }

    // 임시: photo-edit 경로는 인증 없이 통과 (나중에 로그인 기능 추가 시 수정)
    const isPhotoEditPath = req.path?.startsWith('/photo-edit');
    if (isPhotoEditPath) {
      // photo-edit 경로는 인증 없이 통과 (가드가 없으면 user가 없어도 OK)
      return done(null, req.user as User | undefined || null);
    }

    const user = req.user as User | undefined;

    if (!user) {
      return done(new UnauthorizedException('로그인이 필요합니다.'), null);
    }

    return done(null, user);
  }
}

