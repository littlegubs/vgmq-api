import { MigrationInterface, QueryRunner } from "typeorm";

export class lobbyMusicCountdown1656621281159 implements MigrationInterface {
    name = 'lobbyMusicCountdown1656621281159'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`musicFinishPlayingAt\` datetime NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`musicFinishPlayingAt\``);
    }

}
