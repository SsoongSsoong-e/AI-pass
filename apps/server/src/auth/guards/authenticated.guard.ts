import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * AuthenticatedGuard
 * 
 * 인증된 사용자만 접근 가능하도록 하는 Guard
 * 
 * 사용법:
 * @UseGuards(AuthenticatedGuard)
 * async someMethod() { ... }
 * 
 * 또는 전역으로 설정:
 * app.useGlobalGuards(new AuthenticatedGuard());
 * 
 * @Public() 데코레이터가 있으면 인증 없이 접근 가능
 * 
 * AUTH_ENABLED 환경 변수:
 * - false: 인증 없이 모든 요청 통과 (로그인 기능 완성 전까지)
 * - true: 정상적인 인증 검증 수행 (main branch 배포 시)
 */
@Injectable()
export class AuthenticatedGuard extends AuthGuard('session') {
  constructor(
    protected reflector: Reflector,
    protected configService: ConfigService,
  ) {
    super();
  }

  /**
   * 인증 검증
   * 
   * @param context ExecutionContext
   * @returns 인증 성공 여부
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
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
    
    return super.canActivate(context);
  }

  /**
   * 인증 실패 시 처리
   * 
   * @param err 에러 객체
   * @param user 사용자 객체
   * @param info 추가 정보
   * @returns UnauthorizedException
   */
  handleRequest(err: any, user: any, info: any) {
    // AUTH_ENABLED가 false면 이미 canActivate에서 처리되었으므로 여기서는 체크하지 않음
    const authEnabled = this.configService.get<boolean>('app.AUTH_ENABLED', false);
    if (!authEnabled) {
      // 인증이 비활성화된 경우 더미 사용자 반환
      return user || {
        id: 1,
        email: 'dev@example.com',
        username: 'dev_user',
        role: 'USER',
      };
    }

    // @Public() 데코레이터가 있으면 이 메서드는 호출되지 않아야 하지만,
    // 혹시 모를 경우를 대비해 체크
    if (err || !user) {
      throw err || new UnauthorizedException('로그인이 필요합니다.');
    }
    return user;
  }
}

