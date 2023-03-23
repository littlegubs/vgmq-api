import { MigrationInterface, QueryRunner } from "typeorm";

export class gameVideoScreenshots1679582583044 implements MigrationInterface {
    name = 'gameVideoScreenshots1679582583044'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`screenshot\` (\`id\` int NOT NULL AUTO_INCREMENT, \`igdbId\` int NOT NULL, \`imageId\` varchar(255) NOT NULL, \`duration\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`gameId\` int NULL, UNIQUE INDEX \`IDX_19574cdb98940ae847392a2fdf\` (\`igdbId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`video\` (\`id\` int NOT NULL AUTO_INCREMENT, \`igdbId\` int NOT NULL, \`videoId\` varchar(255) NOT NULL, \`duration\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`gameId\` int NULL, UNIQUE INDEX \`IDX_6c609f3d0488e75cd9fff73d40\` (\`igdbId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`lobby_music_screenshots\` (\`lobbyMusicId\` int NOT NULL, \`screenshotId\` int NOT NULL, INDEX \`IDX_660e0f42ca37d877f06fe3ef06\` (\`lobbyMusicId\`), INDEX \`IDX_936eca81ad2041ea627e88f0e3\` (\`screenshotId\`), PRIMARY KEY (\`lobbyMusicId\`, \`screenshotId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`videoId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`screenshot\` ADD CONSTRAINT \`FK_af4bee0312c5b82a3d95504a429\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`video\` ADD CONSTRAINT \`FK_f9aefd15e67f26b613c793faead\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD CONSTRAINT \`FK_408ec64cba11ecf8d332e17f7e1\` FOREIGN KEY (\`videoId\`) REFERENCES \`video\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`lobby_music_screenshots\` ADD CONSTRAINT \`FK_660e0f42ca37d877f06fe3ef064\` FOREIGN KEY (\`lobbyMusicId\`) REFERENCES \`lobby_music\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`lobby_music_screenshots\` ADD CONSTRAINT \`FK_936eca81ad2041ea627e88f0e36\` FOREIGN KEY (\`screenshotId\`) REFERENCES \`screenshot\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music_screenshots\` DROP FOREIGN KEY \`FK_936eca81ad2041ea627e88f0e36\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music_screenshots\` DROP FOREIGN KEY \`FK_660e0f42ca37d877f06fe3ef064\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP FOREIGN KEY \`FK_408ec64cba11ecf8d332e17f7e1\``);
        await queryRunner.query(`ALTER TABLE \`video\` DROP FOREIGN KEY \`FK_f9aefd15e67f26b613c793faead\``);
        await queryRunner.query(`ALTER TABLE \`screenshot\` DROP FOREIGN KEY \`FK_af4bee0312c5b82a3d95504a429\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`videoId\``);
        await queryRunner.query(`DROP INDEX \`IDX_936eca81ad2041ea627e88f0e3\` ON \`lobby_music_screenshots\``);
        await queryRunner.query(`DROP INDEX \`IDX_660e0f42ca37d877f06fe3ef06\` ON \`lobby_music_screenshots\``);
        await queryRunner.query(`DROP TABLE \`lobby_music_screenshots\``);
        await queryRunner.query(`DROP INDEX \`IDX_6c609f3d0488e75cd9fff73d40\` ON \`video\``);
        await queryRunner.query(`DROP TABLE \`video\``);
        await queryRunner.query(`DROP INDEX \`IDX_19574cdb98940ae847392a2fdf\` ON \`screenshot\``);
        await queryRunner.query(`DROP TABLE \`screenshot\``);
    }

}
