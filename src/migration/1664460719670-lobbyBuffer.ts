import { MigrationInterface, QueryRunner } from "typeorm";

export class lobbyBuffer1664460719670 implements MigrationInterface {
    name = 'lobbyBuffer1664460719670'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` CHANGE \`status\` \`status\` enum ('waiting', 'loading', 'playing', 'buffering', 'playing_music', 'answer_reveal', 'final_standing') NOT NULL DEFAULT 'waiting'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` CHANGE \`status\` \`status\` enum ('waiting', 'loading', 'playing', 'playing_music', 'answer_reveal', 'final_standing') NOT NULL DEFAULT 'waiting'`);
    }

}
