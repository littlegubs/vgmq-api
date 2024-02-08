import { MigrationInterface, QueryRunner } from "typeorm";

export class UnplayedGames1707390327414 implements MigrationInterface {
    name = 'UnplayedGames1707390327414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`playedMusics\` int NOT NULL DEFAULT '20'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`playedMusics\``);
    }

}
