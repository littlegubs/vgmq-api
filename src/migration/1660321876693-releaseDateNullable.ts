import { MigrationInterface, QueryRunner } from 'typeorm'

export class releaseDateNullable1660321876693 implements MigrationInterface {
    name = 'releaseDateNullable1660321876693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` MODIFY \`firstReleaseDate\` date NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`game\` MODIFY \`firstReleaseDate\` datetime NOT NULL`,
        )
    }
}
