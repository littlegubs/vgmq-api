import {MigrationInterface, QueryRunner} from "typeorm";

export class gameMusicPlayNumber1654966468849 implements MigrationInterface {
    name = 'gameMusicPlayNumber1654966468849'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`music\` DROP COLUMN \`guessAccuracy\``);
        await queryRunner.query(`ALTER TABLE \`music\` DROP COLUMN \`playNumber\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`guessAccuracy\` float NULL`);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`playNumber\` int NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`playNumber\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`guessAccuracy\``);
        await queryRunner.query(`ALTER TABLE \`music\` ADD \`playNumber\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`music\` ADD \`guessAccuracy\` float NULL`);
    }

}
