import { MigrationInterface, QueryRunner } from 'typeorm'

export class FilePrivate1721745355033 implements MigrationInterface {
    name = 'FilePrivate1721745355033'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`file\` ADD \`private\` tinyint NOT NULL DEFAULT 1`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`file\` DROP COLUMN \`private\``)
    }
}
