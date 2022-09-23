import { MigrationInterface, QueryRunner } from 'typeorm'

export class gamePlatform1663765397247 implements MigrationInterface {
    name = 'gamePlatform1663765397247'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`platform\` (\`id\` int NOT NULL AUTO_INCREMENT, \`igdbId\` int NOT NULL, \`name\` varchar(255) NOT NULL,  \`abbreviation\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_07774dda92250165298b3eec8f\` (\`igdbId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `CREATE TABLE \`games_platforms\` (\`gameId\` int NOT NULL, \`platformId\` int NOT NULL, INDEX \`IDX_37c329e2bb99541abd5fbca3c7\` (\`gameId\`), INDEX \`IDX_70640fd4aaa97da1118dad4abc\` (\`platformId\`), PRIMARY KEY (\`gameId\`, \`platformId\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `ALTER TABLE \`games_platforms\` ADD CONSTRAINT \`FK_37c329e2bb99541abd5fbca3c77\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
        await queryRunner.query(
            `ALTER TABLE \`games_platforms\` ADD CONSTRAINT \`FK_70640fd4aaa97da1118dad4abc9\` FOREIGN KEY (\`platformId\`) REFERENCES \`platform\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`games_platforms\` DROP FOREIGN KEY \`FK_70640fd4aaa97da1118dad4abc9\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`games_platforms\` DROP FOREIGN KEY \`FK_37c329e2bb99541abd5fbca3c77\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_70640fd4aaa97da1118dad4abc\` ON \`games_platforms\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_37c329e2bb99541abd5fbca3c7\` ON \`games_platforms\``,
        )
        await queryRunner.query(`DROP TABLE \`games_platforms\``)
        await queryRunner.query(`DROP INDEX \`IDX_07774dda92250165298b3eec8f\` ON \`platform\``)
        await queryRunner.query(`DROP TABLE \`platform\``)
    }
}
