import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
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
 */
@Injectable()
export class AuthenticatedGuard extends AuthGuard('session') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 인증 검증
   * 
   * @param context ExecutionContext
   * @returns 인증 성공 여부
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
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
    // @Public() 데코레이터가 있으면 이 메서드는 호출되지 않아야 하지만,
    // 혹시 모를 경우를 대비해 체크
    if (err || !user) {
      throw err || new UnauthorizedException('로그인이 필요합니다.');
    }
    return user;
  }
}

