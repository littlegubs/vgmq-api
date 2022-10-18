import { MigrationInterface, QueryRunner } from "typeorm";

export class lobbyUserMusicGuessedRight1666113486292 implements MigrationInterface {
    name = 'lobbyUserMusicGuessedRight1666113486292'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` ADD \`musicGuessedRight\` int NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`musicGuessedRight\``);
    }

}
