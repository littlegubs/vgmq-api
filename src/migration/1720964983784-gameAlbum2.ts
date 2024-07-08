import { MigrationInterface, QueryRunner } from "typeorm";

export class GameAlbum21720964983784 implements MigrationInterface {
    name = 'GameAlbum21720964983784'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_album\` DROP FOREIGN KEY \`FK_1a34acf644e581cf80f112b62ac\``);
        await queryRunner.query(`ALTER TABLE \`game_album\` DROP COLUMN \`addedById\``);
        await queryRunner.query(`ALTER TABLE \`game_album\` ADD \`createdById\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`game_album\` ADD \`updatedById\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`game_album\` ADD CONSTRAINT \`FK_1f5ed0458b99778aa1d87dadcd6\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_album\` ADD CONSTRAINT \`FK_0ebb5437e32f03c11e6f9992c0a\` FOREIGN KEY (\`updatedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_album\` DROP FOREIGN KEY \`FK_0ebb5437e32f03c11e6f9992c0a\``);
        await queryRunner.query(`ALTER TABLE \`game_album\` DROP FOREIGN KEY \`FK_1f5ed0458b99778aa1d87dadcd6\``);
        await queryRunner.query(`ALTER TABLE \`game_album\` DROP COLUMN \`updatedById\``);
        await queryRunner.query(`ALTER TABLE \`game_album\` DROP COLUMN \`createdById\``);
        await queryRunner.query(`ALTER TABLE \`game_album\` ADD \`addedById\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`game_album\` ADD CONSTRAINT \`FK_1a34acf644e581cf80f112b62ac\` FOREIGN KEY (\`addedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
