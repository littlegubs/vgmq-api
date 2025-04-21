import { MigrationInterface, QueryRunner } from 'typeorm'

export class BannedBy1718019539300 implements MigrationInterface {
    name = '1718019360696BannedBy1718019539300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`bannedById\` int NULL`)
        await queryRunner.query(
            `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_5c0d97fb536adaf7e8ae299dd7b\` FOREIGN KEY (\`bannedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_5c0d97fb536adaf7e8ae299dd7b\``,
        )
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`bannedById\``)
    }
}
