import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * OAuthAccount Entity
 * 
 * 여러 OAuth 제공자(Google, Kakao, Naver 등)와 사용자 계정을 연결하는 테이블
 * 
 * 설계 원칙:
 * - 완전 분리 방식: 같은 이메일이라도 다른 OAuth 제공자로 로그인하면 별도 User로 취급
 * - provider + provider_user_id 조합으로 고유성 보장
 * - 현재는 하나의 User가 하나의 OAuth 계정만 가지지만, 향후 다중 OAuth 지원 가능하도록 설계
 */

@Entity('oauth_accounts')
// 복합 인덱스 (Composite Index): 여러 컬럼을 묶어 하나의 인덱스로 설정합니다. 
// 이는 주로 여러 조건을 동시에 검색할 때 유용합니다.
@Index(['provider', 'provider_user_id'], { unique: true }) // provider + provider_user_id 조합은 고유해야 함
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * User와의 관계 (Many-to-One)
   * 여러 OAuth 계정이 하나의 User에 연결됨
   */

  // User 엔티티의 인스턴스(함수 파라미터) 
  // User 엔티티의 oauth_accounts가 이 관계를 역으로 참조
  @ManyToOne(() => User, (user) => user.oauth_accounts, {
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
