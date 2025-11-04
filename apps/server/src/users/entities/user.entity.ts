import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';

/* 
User Entity

사용자 기본 정보를 저장하는 테이블
OAuth Login으로 생성되며, 추후에 여러 OAuth 제공자와 연동 설계 예정

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
        enum: ['user', 'admin'],
        default: 'user',
    })
    role: 'user' | 'admin';

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
    
    /*

    ## User 조회 시 OAuth 정보를 함께 가져오기 위함 
    @OneToMany(() => OAuthAccount, (oauthAccount) => oauthAccount.user, {
        cascade: true,
    })
    oauth_accounts: OAuthAccount[];

    ## 한 User가 여러 사진을 업로드할 경우, Join을 위해서 사용.
    @OneToMany(() => PassportPhoto, (photo) => photo.user, {
    cascade: true,
    })
    passport_photos: PassportPhoto[];

    */
}

