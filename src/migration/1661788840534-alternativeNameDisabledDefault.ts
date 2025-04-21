import { MigrationInterface, QueryRunner } from 'typeorm'

export class alternativeNameDisabledDefault1661788840534 implements MigrationInterface {
    name = 'alternativeNameDisabledDefault1661788840534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`alternative_name\` CHANGE \`enabled\` \`enabled\` tinyint NOT NULL DEFAULT 0`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`alternative_name\` CHANGE \`enabled\` \`enabled\` tinyint NOT NULL DEFAULT '1'`,
        )
    }
}
