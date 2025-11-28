import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedGuard } from './authenticated.guard';
import { UserRole } from '../../users/user-role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * AdminGuard
 * 
 * Admin 역할을 가진 사용자만 접근 가능하도록 하는 Guard
 * 
 * 사용법:
 * @UseGuards(AuthenticatedGuard, AdminGuard)
 * async someMethod() { ... }
 */
@Injectable()
export class AdminGuard extends AuthenticatedGuard {
  constructor(
    reflector: Reflector,
    configService: ConfigService,
  ) {
    super(reflector, configService);
  }

  /**
   * Admin 역할 검증
   * 
   * @param context ExecutionContext
   * @returns Admin 권한 여부
   */
  canActivate(context: ExecutionContext): boolean {
    // @Public() 데코레이터 확인
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true; // Public이면 Admin 검증도 우회
    }

    // 먼저 인증 검증 (AuthenticatedGuard)
    const isAuthenticated = super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Admin 역할 확인
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin 권한이 필요합니다.');
    }

    return true;
  }
}

