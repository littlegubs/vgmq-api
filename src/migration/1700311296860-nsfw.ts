import { MigrationInterface, QueryRunner } from "typeorm";

export class nsfw1700311296860 implements MigrationInterface {
    name = 'nsfw1700311296860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`addedById\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`game\` ADD \`nsfw\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`game\` ADD \`addedById\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_013fc62fbc3502a5c84dfdc1727\` FOREIGN KEY (\`addedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game\` ADD CONSTRAINT \`FK_cfae198ff1a6afa6179c62a931c\` FOREIGN KEY (\`addedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` DROP FOREIGN KEY \`FK_cfae198ff1a6afa6179c62a931c\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_013fc62fbc3502a5c84dfdc1727\``);
        await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`addedById\``);
        await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`nsfw\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`addedById\``);
    }

}
