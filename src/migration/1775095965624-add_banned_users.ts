import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBannedUsers1775095965624 implements MigrationInterface {
    name = 'AddBannedUsers1775095965624'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`lobby_banned_users\` (\`lobbyId\` int NOT NULL, \`userId\` int NOT NULL, INDEX \`IDX_lobby_banned_users_lobbyId\` (\`lobbyId\`), INDEX \`IDX_lobby_banned_users_userId\` (\`userId\`), PRIMARY KEY (\`lobbyId\`, \`userId\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_banned_users\` ADD CONSTRAINT \`FK_lobby_banned_users_lobbyId\` FOREIGN KEY (\`lobbyId\`) REFERENCES \`lobby\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_banned_users\` ADD CONSTRAINT \`FK_lobby_banned_users_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby_banned_users\` DROP FOREIGN KEY \`FK_lobby_banned_users_userId\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_banned_users\` DROP FOREIGN KEY \`FK_lobby_banned_users_lobbyId\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_lobby_banned_users_userId\` ON \`lobby_banned_users\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_lobby_banned_users_lobbyId\` ON \`lobby_banned_users\``,
        )
        await queryRunner.query(`DROP TABLE \`lobby_banned_users\``)
    }
}
