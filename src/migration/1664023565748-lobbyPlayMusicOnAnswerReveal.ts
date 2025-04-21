import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyPlayMusicOnAnswerReveal1664023565748 implements MigrationInterface {
    name = 'lobbyPlayMusicOnAnswerReveal1664023565748'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby\` ADD \`playMusicOnAnswerReveal\` tinyint NOT NULL DEFAULT 0`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`playMusicOnAnswerReveal\``)
    }
}
