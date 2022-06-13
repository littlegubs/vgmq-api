import {MigrationInterface, QueryRunner} from "typeorm";

export class lobbyUserStatusEnum1655142832714 implements MigrationInterface {
    name = 'lobbyUserStatusEnum1655142832714'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`status\``);
        await queryRunner.query(`ALTER TABLE \`lobby_user\` ADD \`status\` enum ('reconnecting') NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`status\``);
        await queryRunner.query(`ALTER TABLE \`lobby_user\` ADD \`status\` varchar(255) NULL`);
    }

}
