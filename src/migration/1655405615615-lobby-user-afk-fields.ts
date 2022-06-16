import {MigrationInterface, QueryRunner} from "typeorm";

export class lobbyUserAfkFields1655405615615 implements MigrationInterface {
    name = 'lobbyUserAfkFields1655405615615'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` ADD \`socketId\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`lobby_user\` ADD \`afkJobId\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`afkJobId\``);
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`socketId\``);
    }

}
