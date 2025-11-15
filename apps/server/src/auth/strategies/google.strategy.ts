import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

/**
 * Google OAuth Strategy
 * 
 * Google OAuth 2.0 인증을 처리하는 Passport Strategy
 * 
 * Flow:
 * 1. 사용자가 /auth/google 접근
 * 2. Google 로그인 페이지로 리다이렉트
 * 3. 사용자 인증 후 /auth/google/callback으로 리다이렉트
 * 4. Google에서 Access Token과 사용자 정보 제공
 * 5. validate() 메서드에서 사용자 정보 처리
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    // 환경 변수 검증
    if (!clientID) {
      throw new Error(
        'GOOGLE_CLIENT_ID 환경 변수가 설정되지 않았습니다. ' +
        'apps/server/env.local 파일에 GOOGLE_CLIENT_ID를 설정해주세요.'
      );
    }
    if (!clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_SECRET 환경 변수가 설정되지 않았습니다. ' +
        'apps/server/env.local 파일에 GOOGLE_CLIENT_SECRET을 설정해주세요.'
      );
    }
    if (!callbackURL) {
      throw new Error(
        'GOOGLE_CALLBACK_URL 환경 변수가 설정되지 않았습니다. ' +
        'apps/server/env.local 파일에 GOOGLE_CALLBACK_URL을 설정해주세요.'
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  /**
   * Google OAuth 콜백 처리
   * 
   * @param accessToken Google에서 발급한 Access Token (사용 후 폐기)
   * @param refreshToken Refresh Token (사용 안 함)
   * @param profile Google 사용자 프로필 정보
   * @param done Passport 콜백 함수
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    // Google에서 받은 사용자 정보 정리
    const userInfo = {
      provider: 'google',
      provider_user_id: id,
      email: emails[0]?.value || null,
      username: name?.givenName || name?.displayName || emails[0]?.value?.split('@')[0] || 'User',
      profile_picture: photos[0]?.value || null,
      profile_metadata: {
        given_name: name?.givenName,
        family_name: name?.familyName,
        display_name: name?.displayName,
        locale: profile._json?.locale,
      },
    };

    try {
      // AuthService에서 사용자 찾기 또는 생성 (완전 분리 방식)
      const user = await this.authService.findOrCreateUser(userInfo);
      
      // Passport가 req.user에 저장할 객체 반환
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}

