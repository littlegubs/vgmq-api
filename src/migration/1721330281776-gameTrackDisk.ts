import { MigrationInterface, QueryRunner } from 'typeorm'

export class GameTrackDisk1721330281776 implements MigrationInterface {
    name = 'GameTrackDisk1721330281776'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`track\` int NULL`)
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`disk\` int NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`disk\``)
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`track\``)
    }
}
