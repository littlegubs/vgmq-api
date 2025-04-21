import { MigrationInterface, QueryRunner } from 'typeorm'

export class playMusicOnAnswerRevealTrue1666192794044 implements MigrationInterface {
    name = 'playMusicOnAnswerRevealTrue1666192794044'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby\` CHANGE \`playMusicOnAnswerReveal\` \`playMusicOnAnswerReveal\` tinyint NOT NULL DEFAULT 1`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby\` CHANGE \`playMusicOnAnswerReveal\` \`playMusicOnAnswerReveal\` tinyint NOT NULL DEFAULT '0'`,
        )
    }
}
