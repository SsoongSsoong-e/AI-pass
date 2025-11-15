import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { OAuthAccount } from '../users/entities/oauth-account.entity';
import { UserRole } from '../users/user-role.enum';

/**
 * 사용자 정보 인터페이스 (Google OAuth에서 받은 정보)
 */
interface OAuthUserInfo {
  provider: string;
  provider_user_id: string;
  email: string | null;
  username: string;
  profile_picture: string | null;
  profile_metadata: Record<string, any>;
}

/**
 * AuthService
 * 
 * OAuth 인증 관련 비즈니스 로직 처리
 * 
 * 설계 원칙:
 * - 완전 분리 방식: provider + provider_user_id만으로 식별
 * - 같은 이메일이라도 다른 OAuth 제공자로 로그인하면 별도 사용자로 취급
 * - 이메일은 provider를 포함한 고유한 형식으로 생성 (예: google_user@gmail.com)
 * - 트랜잭션으로 데이터 일관성 보장
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OAuthAccount)
    private oauthAccountRepository: Repository<OAuthAccount>,
    private dataSource: DataSource,
  ) {}

  /**
   * OAuth 사용자 찾기 또는 생성 (완전 분리 방식)
   * 
   * Flow:
   * 1. provider + provider_user_id로 기존 OAuth 계정 조회
   * 2. 있으면 → 기존 User 반환
   * 3. 없으면 → 신규 User 생성 + OAuth 계정 생성
   * 
   * @param userInfo OAuth 제공자에서 받은 사용자 정보
   * @returns User 엔티티
   */
  async findOrCreateUser(userInfo: OAuthUserInfo): Promise<User> {
    // 트랜잭션 시작
    return await this.dataSource.transaction(async (manager) => {
      // 1단계: provider + provider_user_id로 기존 OAuth 계정 조회
      const existingOAuthAccount = await manager.findOne(OAuthAccount, {
        where: {
          provider: userInfo.provider,
          provider_user_id: userInfo.provider_user_id,
        },
        relations: ['user'],
      });

      // 기존 OAuth 계정이 있으면 기존 User 반환
      if (existingOAuthAccount) {
        return existingOAuthAccount.user;
      }

      // 2단계: 신규 User 생성
      // 같은 이메일이라도 다른 OAuth 제공자로 로그인하면 별도 사용자로 취급
      // 이메일 형식: {provider}_{original_email} 또는 {provider}_{provider_user_id}@oauth.local
      const generateUniqueEmail = (): string => {
        if (userInfo.email) {
          // 이메일이 있으면 provider를 prefix로 추가
          // 예: user@gmail.com -> google_user@gmail.com
          const emailParts = userInfo.email.split('@');
          if (emailParts.length === 2) {
            return `${userInfo.provider}_${emailParts[0]}@${emailParts[1]}`;
          }
        }
        // 이메일이 없으면 provider와 provider_user_id로 생성
        return `${userInfo.provider}_${userInfo.provider_user_id}@oauth.local`;
      };

      const uniqueEmail = generateUniqueEmail();

      const newUser = manager.create(User, {
        email: uniqueEmail,
        username: userInfo.username,
        profile_picture: userInfo.profile_picture,
        role: UserRole.USER,
      });

      const savedUser = await manager.save(User, newUser);

      // 3단계: OAuth 계정 생성 및 연결
      const oauthAccount = manager.create(OAuthAccount, {
        user_id: savedUser.id,
        provider: userInfo.provider,
        provider_user_id: userInfo.provider_user_id,
        profile_metadata: userInfo.profile_metadata,
      });

      await manager.save(OAuthAccount, oauthAccount);

      return savedUser;
    });
  }
}

