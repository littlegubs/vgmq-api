import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyUserStatusAndReconnecting1664370870963 implements MigrationInterface {
    name = 'lobbyUserStatusAndReconnecting1664370870963'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_d47ea6c492f3d81b08814671ef\` ON \`cover\``)
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` ADD \`isReconnecting\` tinyint NOT NULL DEFAULT 0`,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` CHANGE \`status\` \`status\` enum ('buffering', 'ready_to_play_music') NULL`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` CHANGE \`status\` \`status\` enum ('reconnecting') NULL`,
        )
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`isReconnecting\``)
        await queryRunner.query(
            `CREATE UNIQUE INDEX \`IDX_d47ea6c492f3d81b08814671ef\` ON \`cover\` (\`colorPaletteId\`)`,
        )
    }
}
