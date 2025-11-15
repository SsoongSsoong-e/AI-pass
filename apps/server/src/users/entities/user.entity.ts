import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { UserRole } from '../user-role.enum';
import { OAuthAccount } from './oauth-account.entity';

/*
User Entity

사용자 기본 정보를 저장하는 테이블
OAuth Login으로 생성되며, 같은 이메일이라도 다른 OAuth 제공자로 로그인하면 별도 사용자로 취급

설계 원칙:
- 각 OAuth 제공자는 별도의 User로 취급 (완전 분리 방식)
- 이메일은 provider를 포함한 고유한 형식으로 생성 (예: google_user@gmail.com)
- OAuth 계정은 provider + provider_user_id 조합으로 식별
*/

@Entity('Users')
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
     * User 조회 시 OAuth 정보를 함께 가져오기 위함
     * 
     * 참고: 현재는 완전 분리 방식으로, 하나의 User는 하나의 OAuth 계정만 가짐
     * 향후 필요시 여러 OAuth 제공자 연동 지원 가능하도록 설계됨
     */
    @OneToMany(() => OAuthAccount, (oauthAccount) => oauthAccount.user, {
        cascade: true,
    })
    oauth_accounts: OAuthAccount[];
}

