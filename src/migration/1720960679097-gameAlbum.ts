import { MigrationInterface, QueryRunner } from 'typeorm'

export class GameAlbum1720960679097 implements MigrationInterface {
    name = 'GameAlbum1720960679097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`game_album\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`date\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`coverId\` int NULL, \`gameId\` int NULL, \`addedById\` int NULL, \`validatedById\` int NULL, UNIQUE INDEX \`REL_1ca5b8bcd39a1d815074d34989\` (\`coverId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD \`albumId\` int NULL`)
        await queryRunner.query(
            `ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_42949c7554e21d086a76b6c35fa\` FOREIGN KEY (\`albumId\`) REFERENCES \`game_album\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_album\` ADD CONSTRAINT \`FK_1ca5b8bcd39a1d815074d349892\` FOREIGN KEY (\`coverId\`) REFERENCES \`file\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_album\` ADD CONSTRAINT \`FK_3e76e2fb8a75e7ae7683cb42e51\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_album\` ADD CONSTRAINT \`FK_1a34acf644e581cf80f112b62ac\` FOREIGN KEY (\`addedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_album\` ADD CONSTRAINT \`FK_5856969cee8c75a59a71b874a2b\` FOREIGN KEY (\`validatedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`game_album\` DROP FOREIGN KEY \`FK_5856969cee8c75a59a71b874a2b\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_album\` DROP FOREIGN KEY \`FK_1a34acf644e581cf80f112b62ac\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_album\` DROP FOREIGN KEY \`FK_3e76e2fb8a75e7ae7683cb42e51\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_album\` DROP FOREIGN KEY \`FK_1ca5b8bcd39a1d815074d349892\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_42949c7554e21d086a76b6c35fa\``,
        )
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP COLUMN \`albumId\``)
        await queryRunner.query(`DROP INDEX \`REL_1ca5b8bcd39a1d815074d34989\` ON \`game_album\``)
        await queryRunner.query(`DROP TABLE \`game_album\``)
    }
}
