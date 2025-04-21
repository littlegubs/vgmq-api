import { MigrationInterface, QueryRunner } from 'typeorm'

export class gameVideoScreenshots31679593114889 implements MigrationInterface {
    name = 'gameVideoScreenshots31679593114889'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`startVideoAt\` int NOT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`startVideoAt\``)
    }
}
