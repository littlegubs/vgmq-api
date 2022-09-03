import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyGameMode1662123661886 implements MigrationInterface {
    name = 'lobbyGameMode1662123661886'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby\` ADD \`gameMode\` enum ('standard', 'local_couch') NOT NULL DEFAULT 'standard'`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`gameMode\``)
    }
}
