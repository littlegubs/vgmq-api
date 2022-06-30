import { MigrationInterface, QueryRunner } from "typeorm";

export class lobbyMusicDerivedAnswers1656599840800 implements MigrationInterface {
    name = 'lobbyMusicDerivedAnswers1656599840800'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`lobby_music_expected_answers_game\` (\`lobbyMusicId\` int NOT NULL, \`gameId\` int NOT NULL, INDEX \`IDX_f78fcb1b00e5f0cd76af32843a\` (\`lobbyMusicId\`), INDEX \`IDX_be73d0263a0c0f86532660328a\` (\`gameId\`), PRIMARY KEY (\`lobbyMusicId\`, \`gameId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`lobby_music_expected_answers_game\` ADD CONSTRAINT \`FK_f78fcb1b00e5f0cd76af32843a5\` FOREIGN KEY (\`lobbyMusicId\`) REFERENCES \`lobby_music\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`lobby_music_expected_answers_game\` ADD CONSTRAINT \`FK_be73d0263a0c0f86532660328a5\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music_expected_answers_game\` DROP FOREIGN KEY \`FK_be73d0263a0c0f86532660328a5\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music_expected_answers_game\` DROP FOREIGN KEY \`FK_f78fcb1b00e5f0cd76af32843a5\``);
        await queryRunner.query(`DROP INDEX \`IDX_be73d0263a0c0f86532660328a\` ON \`lobby_music_expected_answers_game\``);
        await queryRunner.query(`DROP INDEX \`IDX_f78fcb1b00e5f0cd76af32843a\` ON \`lobby_music_expected_answers_game\``);
        await queryRunner.query(`DROP TABLE \`lobby_music_expected_answers_game\``);
    }

}
