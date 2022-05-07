import {MigrationInterface, QueryRunner} from "typeorm";

export class userResetPassword1651942169595 implements MigrationInterface {
    name = 'userResetPassword1651942169595'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`resetPasswordToken\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`resetPasswordTokenCreatedAt\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`resetPasswordTokenCreatedAt\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`resetPasswordToken\``);
    }

}
