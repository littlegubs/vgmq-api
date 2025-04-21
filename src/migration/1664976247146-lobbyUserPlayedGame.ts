import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyUserPlayedGame1664976247146 implements MigrationInterface {
    name = 'lobbyUserPlayedGame1664976247146'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` ADD \`playedTheGame\` tinyint NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`playedTheGame\``)
    }
}
