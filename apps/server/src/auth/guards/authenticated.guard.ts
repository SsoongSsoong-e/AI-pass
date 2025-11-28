import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * AuthenticatedGuard
 * 
 * 인증된 사용자만 접근 가능하도록 하는 Guard
 * 
 * passport.session() 미들웨어가 deserializeUser()를 호출하여 req.user를 설정한 후,
 * 이 Guard가 req.user를 확인합니다.
 * 
 * 사용법:
 * @UseGuards(AuthenticatedGuard)
 * async someMethod() { ... }
 * 
 * @Public() 데코레이터가 있으면 인증 없이 접근 가능
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(
    protected reflector: Reflector,
    protected configService: ConfigService,
  ) {}

  /**
   * 인증 검증
   * 
   * @param context ExecutionContext
   * @returns 인증 성공 여부
   */
  canActivate(context: ExecutionContext): boolean {
    // @Public() 데코레이터가 있으면 인증 없이 통과
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      // @Public()이 있으면 가드를 완전히 우회
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    console.log('🛡️ [AuthenticatedGuard] canActivate, path:', request.path, 'req.user:', request.user ? request.user.email : 'null');
    
    // passport.session() 미들웨어가 deserializeUser()를 호출하여 req.user를 설정했는지 확인
    if (!request.user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    
    return true;
  }
}

