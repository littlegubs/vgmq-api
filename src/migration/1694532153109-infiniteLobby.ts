import { MigrationInterface, QueryRunner } from 'typeorm'

export class infiniteLobby1694532153109 implements MigrationInterface {
    name = 'infiniteLobby1694532153109'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`custom\` tinyint NOT NULL DEFAULT 1`)
        await queryRunner.query(
            `ALTER TABLE \`lobby\` ADD \`loopsWithNoUsers\` int NOT NULL DEFAULT '0'`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`loopsWithNoUsers\``)
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`custom\``)
    }
}
