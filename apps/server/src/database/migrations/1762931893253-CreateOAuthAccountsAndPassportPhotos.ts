import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOAuthAccountsAndPassportPhotos1762931893253 implements MigrationInterface {
    name = 'CreateOAuthAccountsAndPassportPhotos1762931893253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // oauth_accounts 테이블 생성
        await queryRunner.query(`
            CREATE TABLE "oauth_accounts" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "provider" character varying(50) NOT NULL,
                "provider_user_id" character varying(255) NOT NULL,
                "profile_metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_oauth_accounts_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_oauth_accounts_user_id" FOREIGN KEY ("user_id") 
                    REFERENCES users("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "UQ_oauth_accounts_provider_user_id" 
                    UNIQUE ("provider", "provider_user_id")
            )
        `);

        // oauth_accounts 인덱스 생성
        await queryRunner.query(`
            CREATE INDEX "IDX_oauth_accounts_user_id" ON "oauth_accounts" ("user_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 인덱스 삭제
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_oauth_accounts_user_id"`);
        
        // 테이블 삭제
        await queryRunner.query(`DROP TABLE IF EXISTS "oauth_accounts"`);
    }
}

