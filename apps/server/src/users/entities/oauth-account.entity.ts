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

@Entity('oauth_accounts')
// 복합 인덱스 (Composite Index): 여러 컬럼을 묶어 하나의 인덱스로 설정합니다.
// provider + provider_user_id 조합은 고유해야 함
@Index(['provider', 'provider_user_id'], { unique: true }) 
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.oauth_account, {
    onDelete: 'CASCADE', // User 삭제 시 OAuth 계정도 함께 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: number;

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
