import { SetMetadata } from '@nestjs/common';

/**
 * @Public() 데코레이터
 * 
 * 이 데코레이터를 사용하면 인증 없이 접근 가능합니다.
 * 
 * 사용법:
 * @Public()
 * @Post()
 * async someMethod() { ... }
 * 
 * 나중에 로그인 기능을 추가한 후:
 * - 인증이 필요한 엔드포인트에서 @Public() 제거
 * - 또는 @UseGuards(AuthenticatedGuard) 추가
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

