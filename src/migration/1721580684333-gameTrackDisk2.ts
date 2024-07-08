import { MigrationInterface, QueryRunner } from "typeorm";

export class GameTrackDisk21721580684333 implements MigrationInterface {
    name = 'GameTrackDisk21721580684333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`music\` ADD \`track\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`music\` ADD \`disk\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`music\` DROP COLUMN \`disk\``);
        await queryRunner.query(`ALTER TABLE \`music\` DROP COLUMN \`track\``);
    }

}
