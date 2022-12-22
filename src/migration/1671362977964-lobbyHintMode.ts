import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyHintMode1671362977964 implements MigrationInterface {
    name = 'lobbyHintMode1671362977964'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` ADD \`hintMode\` tinyint NOT NULL DEFAULT 0`,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` ADD \`keepHintMode\` tinyint NOT NULL DEFAULT 0`,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby\` ADD \`hintMode\` enum ('disabled', 'allowed', 'always') NOT NULL DEFAULT 'allowed'`,
        )
        await queryRunner.query(`ALTER TABLE \`music_accuracy\` ADD \`hintMode\` tinyint NOT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`music_accuracy\` DROP COLUMN \`hintMode\``)
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`hintMode\``)
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`keepHintMode\``)
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`hintMode\``)
    }
}
