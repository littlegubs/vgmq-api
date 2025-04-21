import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyMusicMissingData1661606160310 implements MigrationInterface {
    name = 'lobbyMusicMissingData1661606160310'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby_music\` ADD \`contributeToMissingData\` tinyint NOT NULL`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby_music\` DROP COLUMN \`contributeToMissingData\``,
        )
    }
}
