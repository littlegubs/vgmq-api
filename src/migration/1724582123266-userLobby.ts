import { MigrationInterface, QueryRunner } from 'typeorm'

export class UserLobby1724582123266 implements MigrationInterface {
    name = 'UserLobby1724582123266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_62aaa60b7d806a445ecd50870e2\``,
        )
        await queryRunner.query(`DROP INDEX \`REL_62aaa60b7d806a445ecd50870e\` ON \`user\``)
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`currentLobbyId\``)
        await queryRunner.query(`ALTER TABLE \`lobby_user\` ADD \`userId\` int NULL`)
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` ADD UNIQUE INDEX \`IDX_8299cbcd62fd1a04f84617885b\` (\`userId\`)`,
        )
        await queryRunner.query(
            `CREATE UNIQUE INDEX \`REL_8299cbcd62fd1a04f84617885b\` ON \`lobby_user\` (\`userId\`)`,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` ADD CONSTRAINT \`FK_8299cbcd62fd1a04f84617885b7\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` DROP FOREIGN KEY \`FK_8299cbcd62fd1a04f84617885b7\``,
        )
        await queryRunner.query(`DROP INDEX \`REL_8299cbcd62fd1a04f84617885b\` ON \`lobby_user\``)
        await queryRunner.query(
            `ALTER TABLE \`lobby_user\` DROP INDEX \`IDX_8299cbcd62fd1a04f84617885b\``,
        )
        await queryRunner.query(`ALTER TABLE \`lobby_user\` DROP COLUMN \`userId\``)
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`currentLobbyId\` int NULL`)
        await queryRunner.query(
            `CREATE UNIQUE INDEX \`REL_62aaa60b7d806a445ecd50870e\` ON \`user\` (\`currentLobbyId\`)`,
        )
        await queryRunner.query(
            `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_62aaa60b7d806a445ecd50870e2\` FOREIGN KEY (\`currentLobbyId\`) REFERENCES \`lobby_user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
        )
    }
}
