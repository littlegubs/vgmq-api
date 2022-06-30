import {MigrationInterface, QueryRunner} from "typeorm";

export class GameToMusicType1656345447991 implements MigrationInterface {
    name = 'GameToMusicType1656345447991'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`type\` enum ('original', 'reused') NOT NULL DEFAULT 'original'`);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`originalGameToMusicId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_15f33d690abc21fff6ec4910bc9\` FOREIGN KEY (\`originalGameToMusicId\`) REFERENCES \`game_to_music\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_15f33d690abc21fff6ec4910bc9\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`originalGameToMusicId\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`type\``);
    }

}
