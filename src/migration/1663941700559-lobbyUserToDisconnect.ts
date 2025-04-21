import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyUserToDisconnect1663941700559 implements MigrationInterface {
    name = 'lobbyUserToDisconnect1663941700559'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` ADD \`toDisconnect\` tinyint NOT NULL DEFAULT 0`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`toDisconnect\``)
    }
}
