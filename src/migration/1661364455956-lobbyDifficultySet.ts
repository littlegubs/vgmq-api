import { MigrationInterface, QueryRunner } from "typeorm";

export class lobbyDifficultySet1661364455956 implements MigrationInterface {
    name = 'lobbyDifficultySet1661364455956'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`difficulty\` set ('easy', 'medium', 'hard') NOT NULL DEFAULT 'easy,medium,hard'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`difficulty\``);
    }

}
