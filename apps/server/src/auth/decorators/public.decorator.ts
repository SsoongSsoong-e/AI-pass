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
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

