import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyAllowContributeMissingData1661952000793 implements MigrationInterface {
    name = 'lobbyAllowContributeMissingData1661952000793'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby\` ADD \`allowContributeToMissingData\` tinyint NOT NULL DEFAULT 1`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby\` DROP COLUMN \`allowContributeToMissingData\``,
        )
    }
}
