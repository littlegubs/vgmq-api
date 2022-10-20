import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyUserTries1666298757353 implements MigrationInterface {
    name = 'lobbyUserTries1666298757353'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` ADD \`tries\` int NOT NULL DEFAULT '0'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`tries\``)
    }
}
