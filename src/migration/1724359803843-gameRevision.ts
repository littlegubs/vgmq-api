import { MigrationInterface, QueryRunner } from "typeorm";

export class GameRevision1724359803843 implements MigrationInterface {
    name = 'GameRevision1724359803843'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`game_revision_music\` (\`id\` int NOT NULL AUTO_INCREMENT, \`gameToMusicId\` int NULL, \`gameRevisionId\` int NULL, \`albumId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`game_revision_album\` (\`id\` int NOT NULL AUTO_INCREMENT, \`albumId\` int NULL, \`gameRevisionId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`game_revision_message\` (\`id\` int NOT NULL AUTO_INCREMENT, \`message\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`userId\` int NULL, \`gameRevisionId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`game_revision\` (\`id\` int NOT NULL AUTO_INCREMENT, \`status\` set ('pending', 'approved', 'refused') NOT NULL DEFAULT 'pending', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`gameId\` int NULL, \`addedById\` int NULL, \`validatedById\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`game_revision_music\` ADD CONSTRAINT \`FK_a3cbeefb2a75fc29697b88bdcc3\` FOREIGN KEY (\`gameRevisionId\`) REFERENCES \`game_revision\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_revision_music\` ADD CONSTRAINT \`FK_f04b3011cee61a127a48fa8a17e\` FOREIGN KEY (\`albumId\`) REFERENCES \`game_revision_album\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_revision_album\` ADD CONSTRAINT \`FK_f7058c5ec4534119470ca2e410d\` FOREIGN KEY (\`gameRevisionId\`) REFERENCES \`game_revision\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_revision_message\` ADD CONSTRAINT \`FK_0d67c92257af90514495ed018ca\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_revision_message\` ADD CONSTRAINT \`FK_5e95f4c126e7085af85ec1f7f80\` FOREIGN KEY (\`gameRevisionId\`) REFERENCES \`game_revision\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_revision\` ADD CONSTRAINT \`FK_adf54b3830da3bb5fcdcb7d8b3f\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_revision\` ADD CONSTRAINT \`FK_626fcc4dce99d862ff7e52927f0\` FOREIGN KEY (\`addedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_revision\` ADD CONSTRAINT \`FK_e78060007d20dd09ef66e2f62e3\` FOREIGN KEY (\`validatedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_revision\` DROP FOREIGN KEY \`FK_e78060007d20dd09ef66e2f62e3\``);
        await queryRunner.query(`ALTER TABLE \`game_revision\` DROP FOREIGN KEY \`FK_626fcc4dce99d862ff7e52927f0\``);
        await queryRunner.query(`ALTER TABLE \`game_revision\` DROP FOREIGN KEY \`FK_adf54b3830da3bb5fcdcb7d8b3f\``);
        await queryRunner.query(`ALTER TABLE \`game_revision_message\` DROP FOREIGN KEY \`FK_5e95f4c126e7085af85ec1f7f80\``);
        await queryRunner.query(`ALTER TABLE \`game_revision_message\` DROP FOREIGN KEY \`FK_0d67c92257af90514495ed018ca\``);
        await queryRunner.query(`ALTER TABLE \`game_revision_album\` DROP FOREIGN KEY \`FK_f7058c5ec4534119470ca2e410d\``);
        await queryRunner.query(`ALTER TABLE \`game_revision_music\` DROP FOREIGN KEY \`FK_f04b3011cee61a127a48fa8a17e\``);
        await queryRunner.query(`ALTER TABLE \`game_revision_music\` DROP FOREIGN KEY \`FK_a3cbeefb2a75fc29697b88bdcc3\``);
        await queryRunner.query(`DROP TABLE \`game_revision\``);
        await queryRunner.query(`DROP TABLE \`game_revision_message\``);
        await queryRunner.query(`DROP TABLE \`game_revision_album\``);
        await queryRunner.query(`DROP TABLE \`game_revision_music\``);
    }

}
