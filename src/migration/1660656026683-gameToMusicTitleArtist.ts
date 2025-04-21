import { MigrationInterface, QueryRunner } from 'typeorm'

export class gameToMusicTitleArtist1660656026683 implements MigrationInterface {
    name = 'gameToMusicTitleArtist1660656026683'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`title\` varchar(255) NULL`)
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`artist\` varchar(255) NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`artist\``)
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`title\``)
    }
}
