import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
} from 'typeorm';
import { UserRole } from '../user-role.enum';
import { OAuthAccount } from './oauth-account.entity';

/*
User Entity

사용자 기본 정보를 저장하는 테이블
OAuth Login으로 생성되며, 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 이메일이 자동으로 구분됨

설계 원칙:
- 각 OAuth 제공자는 별도의 User로 취급 (완전 분리 방식)
- 다른 OAuth 제공자는 서로 다른 도메인을 사용하므로 이메일이 자동으로 구분됨
  (예: Google -> user@gmail.com, Kakao -> user@kakao.com)
- 원본 이메일을 그대로 사용 (provider prefix 불필요)
- OAuth 계정은 provider + provider_user_id 조합으로 식별
- 현재 비즈니스 로직: OAuth 계정 하나당 항상 새로운 User 생성 (One-to-One 관계)
*/

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 50})
    username: string;

    @Column({ type: 'text', nullable: true})
    profile_picture: string | null;

    @Column({ 
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
    /**
     * User와 연결된 OAuth 계정 (One-to-One)
     * 
     * 한 User는 정확히 하나의 OAuthAccount에 연결됨
     * OAuth 계정 하나당 항상 새로운 User가 생성되므로 One-to-One 관계
     */
    @OneToOne(() => OAuthAccount, (oauthAccount) => oauthAccount.user, {
        cascade: true,
    })
    oauth_account: OAuthAccount;
}

