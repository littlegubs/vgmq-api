import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyCorrectAnswerHidden1683377524767 implements MigrationInterface {
    name = 'lobbyCorrectAnswerHidden1683377524767'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby\` ADD \`showCorrectAnswersDuringGuessTime\` tinyint NOT NULL DEFAULT 0`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby\` DROP COLUMN \`showCorrectAnswersDuringGuessTime\``,
        )
    }
}
