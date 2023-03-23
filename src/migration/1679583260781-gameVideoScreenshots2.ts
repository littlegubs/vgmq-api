import { MigrationInterface, QueryRunner } from "typeorm";

export class gameVideoScreenshots21679583260781 implements MigrationInterface {
    name = 'gameVideoScreenshots21679583260781'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`screenshot\` DROP COLUMN \`duration\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`screenshot\` ADD \`duration\` varchar(255) NOT NULL`);
    }

}
