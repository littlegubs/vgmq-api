import { MigrationInterface, QueryRunner } from "typeorm";

export class lobbyMusicCountdown21656621317272 implements MigrationInterface {
    name = 'lobbyMusicCountdown21656621317272'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` CHANGE \`musicFinishPlayingAt\` \`musicFinishPlayingAt\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` CHANGE \`musicFinishPlayingAt\` \`musicFinishPlayingAt\` datetime NOT NULL`);
    }

}
