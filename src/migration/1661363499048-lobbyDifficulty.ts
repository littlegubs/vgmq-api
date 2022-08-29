import { MigrationInterface, QueryRunner } from "typeorm";

export class lobbyDifficulty1661363499048 implements MigrationInterface {
    name = 'lobbyDifficulty1661363499048'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`customDifficulty\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`minDifficulty\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`maxDifficulty\` int NOT NULL DEFAULT '100'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`maxDifficulty\``);
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`minDifficulty\``);
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`customDifficulty\``);
    }

}
