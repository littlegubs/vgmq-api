import { MigrationInterface, QueryRunner } from "typeorm";

export class LobbyBannedUsers1782845145577 implements MigrationInterface {
    name = 'LobbyBannedUsers1782845145577'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`music_accuracy\` (\`id\` int NOT NULL AUTO_INCREMENT, \`correctAnswer\` tinyint NOT NULL, \`playedTheGame\` tinyint NOT NULL, \`hintMode\` tinyint NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`gameToMusicId\` int NULL, \`userId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`lobby_banned_users\` (\`lobbyId\` int NOT NULL, \`userId\` int NOT NULL, INDEX \`IDX_ba03cbc603b4ab3199144a2699\` (\`lobbyId\`), INDEX \`IDX_9c474f0e064991284717c5fbdd\` (\`userId\`), PRIMARY KEY (\`lobbyId\`, \`userId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`music_accuracy\` ADD CONSTRAINT \`FK_8704413205aaac7825318ac0bf2\` FOREIGN KEY (\`gameToMusicId\`) REFERENCES \`game_to_music\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`music_accuracy\` ADD CONSTRAINT \`FK_aefb5537dd198e25026353c15a8\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`lobby_banned_users\` ADD CONSTRAINT \`FK_ba03cbc603b4ab3199144a26991\` FOREIGN KEY (\`lobbyId\`) REFERENCES \`lobby\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`lobby_banned_users\` ADD CONSTRAINT \`FK_9c474f0e064991284717c5fbdd3\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_banned_users\` DROP FOREIGN KEY \`FK_9c474f0e064991284717c5fbdd3\``);
        await queryRunner.query(`ALTER TABLE \`lobby_banned_users\` DROP FOREIGN KEY \`FK_ba03cbc603b4ab3199144a26991\``);
        await queryRunner.query(`ALTER TABLE \`music_accuracy\` DROP FOREIGN KEY \`FK_aefb5537dd198e25026353c15a8\``);
        await queryRunner.query(`ALTER TABLE \`music_accuracy\` DROP FOREIGN KEY \`FK_8704413205aaac7825318ac0bf2\``);
        await queryRunner.query(`DROP INDEX \`IDX_9c474f0e064991284717c5fbdd\` ON \`lobby_banned_users\``);
        await queryRunner.query(`DROP INDEX \`IDX_ba03cbc603b4ab3199144a2699\` ON \`lobby_banned_users\``);
        await queryRunner.query(`DROP TABLE \`lobby_banned_users\``);
        await queryRunner.query(`DROP TABLE \`music_accuracy\``);
    }

}
