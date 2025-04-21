import { MigrationInterface, QueryRunner } from 'typeorm'

export class lobbyMusicHintModeGames1671047670372 implements MigrationInterface {
    name = 'lobbyMusicHintModeGames1671047670372'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`games_similar_games\` DROP FOREIGN KEY \`FK_644325599a32b517a11aa1c55a7\``,
        )
        await queryRunner.query(
            `CREATE TABLE \`lobby_music_hint_mode_games_game\` (\`lobbyMusicId\` int NOT NULL, \`gameId\` int NOT NULL, INDEX \`IDX_4e5bd175ea2a45663515f36f69\` (\`lobbyMusicId\`), INDEX \`IDX_1adf7f940b271612d0cd2bc641\` (\`gameId\`), PRIMARY KEY (\`lobbyMusicId\`, \`gameId\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_music_hint_mode_games_game\` ADD CONSTRAINT \`FK_4e5bd175ea2a45663515f36f69f\` FOREIGN KEY (\`lobbyMusicId\`) REFERENCES \`lobby_music\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_music_hint_mode_games_game\` ADD CONSTRAINT \`FK_1adf7f940b271612d0cd2bc6417\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
        await queryRunner.query(
            `ALTER TABLE \`games_similar_games\` ADD CONSTRAINT \`FK_644325599a32b517a11aa1c55a7\` FOREIGN KEY (\`similarGameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`games_similar_games\` DROP FOREIGN KEY \`FK_644325599a32b517a11aa1c55a7\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_music_hint_mode_games_game\` DROP FOREIGN KEY \`FK_1adf7f940b271612d0cd2bc6417\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`lobby_music_hint_mode_games_game\` DROP FOREIGN KEY \`FK_4e5bd175ea2a45663515f36f69f\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_1adf7f940b271612d0cd2bc641\` ON \`lobby_music_hint_mode_games_game\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_4e5bd175ea2a45663515f36f69\` ON \`lobby_music_hint_mode_games_game\``,
        )
        await queryRunner.query(`DROP TABLE \`lobby_music_hint_mode_games_game\``)
        await queryRunner.query(
            `ALTER TABLE \`games_similar_games\` ADD CONSTRAINT \`FK_644325599a32b517a11aa1c55a7\` FOREIGN KEY (\`similarGameId\`) REFERENCES \`game\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
    }
}
