import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * OAuthAccount Entity
 * 
 * OAuth 제공자(Google, Kakao, Naver 등)와 사용자 계정을 연결하는 테이블
 * 
 * 설계 원칙:
 * - 완전 분리 방식: 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 이메일이 자동으로 구분됨
 * - provider + provider_user_id 조합으로 고유성 보장
 * - 한 OAuthAccount는 정확히 하나의 User에 연결됨 (One-to-One 관계)
 * - 비즈니스 로직상 OAuth 계정 하나당 항상 새로운 User 생성
 */

@Entity('oauth_accounts')
// 복합 인덱스 (Composite Index): 여러 컬럼을 묶어 하나의 인덱스로 설정합니다. 
// 이는 주로 여러 조건을 동시에 검색할 때 유용합니다.
@Index(['provider', 'provider_user_id'], { unique: true }) // provider + provider_user_id 조합은 고유해야 함
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * User와의 관계 (One-to-One)
   * 
   * 한 OAuthAccount는 정확히 하나의 User에 연결됨
   * OAuth 계정 하나당 항상 새로운 User가 생성되므로 One-to-One 관계
   */
  @OneToOne(() => User, (user) => user.oauth_account, {
    onDelete: 'CASCADE', // User 삭제 시 OAuth 계정도 함께 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: number;

  /**
   * OAuth 제공자 (예: 'google', 'kakao', 'naver')
   * 향후 확장을 위해 enum 대신 varchar 사용
   */
  @Column({ type: 'varchar', length: 50 })
  provider: string;

  /**
   * OAuth 제공자에서 발급한 고유 사용자 ID
   * 예: Google의 경우 "123456789" 같은 숫자 문자열
   */
  @Column({ type: 'varchar', length: 255 })
  provider_user_id: string;

  /**
   * OAuth 제공자에서 받은 추가 프로필 정보 (JSON)
   * 예: { picture: "https://...", locale: "ko" }
   * 필요 시 확장 가능하도록 JSON 타입 사용
   */
  @Column({ type: 'jsonb', nullable: true })
  profile_metadata: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;
}
