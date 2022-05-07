import {MigrationInterface, QueryRunner} from "typeorm";

export class userConfirmationToken1651919095566 implements MigrationInterface {
    name = 'userConfirmationToken1651919095566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`confirmationToken\` varchar(40) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`enabled\` \`enabled\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`enabled\` \`enabled\` tinyint NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`confirmationToken\``);
    }

}
