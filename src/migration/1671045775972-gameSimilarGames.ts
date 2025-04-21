import { MigrationInterface, QueryRunner } from 'typeorm'

export class gameSimilarGames1671045775972 implements MigrationInterface {
    name = 'gameSimilarGames1671045775972'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`games_similar_games\` (\`gameId\` int NOT NULL, \`similarGameId\` int NOT NULL, INDEX \`IDX_7eecbc8fb7fd05e64b4ea59133\` (\`gameId\`), INDEX \`IDX_644325599a32b517a11aa1c55a\` (\`similarGameId\`), PRIMARY KEY (\`gameId\`, \`similarGameId\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `ALTER TABLE \`games_similar_games\` ADD CONSTRAINT \`FK_7eecbc8fb7fd05e64b4ea59133b\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
        await queryRunner.query(
            `ALTER TABLE \`games_similar_games\` ADD CONSTRAINT \`FK_644325599a32b517a11aa1c55a7\` FOREIGN KEY (\`similarGameId\`) REFERENCES \`game\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`games_similar_games\` DROP FOREIGN KEY \`FK_644325599a32b517a11aa1c55a7\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`games_similar_games\` DROP FOREIGN KEY \`FK_7eecbc8fb7fd05e64b4ea59133b\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_644325599a32b517a11aa1c55a\` ON \`games_similar_games\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_7eecbc8fb7fd05e64b4ea59133\` ON \`games_similar_games\``,
        )
        await queryRunner.query(`DROP TABLE \`games_similar_games\``)
    }
}
