import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { OAuthAccount } from '../users/entities/oauth-account.entity';
import { UserRole } from '../users/user-role.enum';
import { EnvironmentVariables } from '../config/env.schema';

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
 * - 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 이메일이 자동으로 구분됨
 *   (예: Google -> user@gmail.com, Kakao -> user@kakao.com)
 * - 원본 이메일을 그대로 사용 (provider prefix 불필요)
 * - 트랜잭션으로 데이터 일관성 보장
 * - OAuth 계정 하나당 항상 새로운 User 생성 (One-to-One 관계)
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OAuthAccount)
    private oauthAccountRepository: Repository<OAuthAccount>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  /**
   * 이메일이 Admin 이메일 목록에 있는지 확인
   */
  private isAdminEmail(email: string | null): boolean {
    if (!email) return false;
    const appConfig = this.configService.get('app') as any;
    const adminEmails = (appConfig?.ADMIN_EMAILS as string[]) || [];
    return adminEmails.includes(email.toLowerCase());
  }

  /**
   * OAuth 사용자 찾기 또는 생성 (완전 분리 방식)
   * 
   * Flow:
   * 1. provider + provider_user_id로 기존 OAuth 계정 조회
   * 2. 있으면 → 기존 User 반환
   * 3. 없으면 → 신규 User 생성 + OAuth 계정 생성
   * 
   * 중요: OAuth 계정 하나당 항상 새로운 User를 생성하므로,
   * 같은 User가 여러 OAuth 제공자와 연결되는 경우는 없습니다.
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
      // 단, 이메일이 Admin 목록에 있고 현재 역할이 USER인 경우 ADMIN으로 업데이트
      // profile_picture도 업데이트 (Google에서 최신 프로필 사진을 받아올 수 있음)
      if (existingOAuthAccount) {
        const user = existingOAuthAccount.user;
        let needsUpdate = false;
        
        // 이메일이 Admin 목록에 있고 현재 역할이 USER인 경우 ADMIN으로 업데이트
        if (this.isAdminEmail(user.email) && user.role !== UserRole.ADMIN) {
          user.role = UserRole.ADMIN;
          needsUpdate = true;
        }
        
        // profile_picture 업데이트 (Google에서 받은 최신 프로필 사진으로)
        if (userInfo.profile_picture && userInfo.profile_picture !== user.profile_picture) {
          user.profile_picture = userInfo.profile_picture;
          needsUpdate = true;
        }
        
        // username도 업데이트 (변경되었을 수 있음)
        if (userInfo.username && userInfo.username !== user.username) {
          user.username = userInfo.username;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await manager.save(User, user);
        }
        
        return user;
      }

      // 2단계: 신규 User 생성
      // 다른 OAuth 제공자는 다른 도메인을 사용하므로 이메일이 자동으로 구분됨
      // 예: Google OAuth -> user@gmail.com, Kakao OAuth -> user@kakao.com
      // 따라서 provider prefix를 붙일 필요 없이 원본 이메일을 그대로 사용
      const generateUniqueEmail = (): string => {
        if (userInfo.email) {
          // OAuth 제공자에서 받은 원본 이메일 그대로 사용
          // 각 OAuth 제공자는 서로 다른 도메인을 사용하므로 자동으로 구분됨
          return userInfo.email;
        }
        // 이메일이 없으면 provider와 provider_user_id로 생성
        return `${userInfo.provider}_${userInfo.provider_user_id}@oauth.local`;
      };

      const uniqueEmail = generateUniqueEmail();

      // Admin 이메일 목록에 있으면 ADMIN 역할로 설정, 아니면 USER
      const userRole = this.isAdminEmail(uniqueEmail) ? UserRole.ADMIN : UserRole.USER;

      const newUser = manager.create(User, {
        email: uniqueEmail,
        username: userInfo.username,
        profile_picture: userInfo.profile_picture,
        role: userRole,
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

