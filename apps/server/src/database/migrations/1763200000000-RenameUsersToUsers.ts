import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameUsersToUsers1763200000000 implements MigrationInterface {
    name = 'RenameUsersToUsers1763200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. ENUM 타입 이름 변경: Users_role_enum → users_role_enum
        await queryRunner.query(`ALTER TYPE "public"."Users_role_enum" RENAME TO "users_role_enum"`);

        // 2. Users 테이블을 users로 리네임
        await queryRunner.query(`ALTER TABLE "Users" RENAME TO users`);

        // 3. 테이블의 role 컬럼이 새로운 ENUM 타입을 참조하도록 변경
        await queryRunner.query(`ALTER TABLE users ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::text::"public"."users_role_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 롤백: users → Users로 되돌리기
        await queryRunner.query(`ALTER TABLE users RENAME TO "Users"`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "Users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "Users" ALTER COLUMN "role" TYPE "public"."Users_role_enum" USING "role"::text::"public"."Users_role_enum"`);
    }
}

