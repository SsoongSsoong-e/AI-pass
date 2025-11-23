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
 * 
 * AUTH_ENABLED 환경 변수:
 * - false: 인증 없이 모든 요청 통과 (로그인 기능 완성 전까지)
 * - true: 정상적인 인증 검증 수행 (main branch 배포 시)
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
    // AUTH_ENABLED가 false면 인증 없이 통과 (일시적으로 인증 비활성화)
    const authEnabled = this.configService.get<boolean>('app.AUTH_ENABLED', false);
    if (!authEnabled) {
      // 인증이 비활성화된 경우, 더미 사용자를 설정하여 req.user 접근 가능하도록 함
      const request = context.switchToHttp().getRequest();
      if (!request.user) {
        // 더미 사용자 설정 (개발용, 실제 프로덕션에서는 사용하지 않음)
        request.user = {
          id: 1, // 기본 사용자 ID
          email: 'dev@example.com',
          username: 'dev_user',
          role: 'USER',
        };
      }
      return true;
    }

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

