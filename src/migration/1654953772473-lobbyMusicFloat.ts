import {MigrationInterface, QueryRunner} from "typeorm";

export class lobbyMusicFloat1654953772473 implements MigrationInterface {
    name = 'lobbyMusicFloat1654953772473'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`startAt\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`startAt\` float NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`endAt\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`endAt\` float NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`endAt\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`endAt\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`startAt\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`startAt\` int NOT NULL`);
    }

}
