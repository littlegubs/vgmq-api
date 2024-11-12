import { MigrationInterface, QueryRunner } from "typeorm";

export class VoteSkip1730223398024 implements MigrationInterface {
    name = 'VoteSkip1730223398024'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`nextJobName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`nextJobId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`lobby\` ADD \`voteSkip\` int NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`voteSkip\``);
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`nextJobId\``);
        await queryRunner.query(`ALTER TABLE \`lobby\` DROP COLUMN \`nextJobName\``);
    }

}
