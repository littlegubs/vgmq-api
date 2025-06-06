import { MigrationInterface, QueryRunner } from 'typeorm'

export class BanUser1717717905283 implements MigrationInterface {
    name = 'BanUser1717717905283'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`banReason\` varchar(255) NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`banReason\``)
    }
}
