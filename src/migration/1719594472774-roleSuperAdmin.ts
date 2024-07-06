import { MigrationInterface, QueryRunner } from 'typeorm'

export class RoleSuperAdmin1719594472774 implements MigrationInterface {
    name = 'RoleSuperAdmin1719594472774'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`user\` CHANGE \`roles\` \`roles\` set ('user', 'admin', 'super_admin') NOT NULL DEFAULT 'user'`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`user\` CHANGE \`roles\` \`roles\` set ('user', 'admin') NOT NULL DEFAULT 'user'`,
        )
    }
}
