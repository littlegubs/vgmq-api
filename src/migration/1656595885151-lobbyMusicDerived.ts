import { MigrationInterface, QueryRunner } from "typeorm";

export class lobbyMusicDerived1656595885151 implements MigrationInterface {
    name = 'lobbyMusicDerived1656595885151'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP FOREIGN KEY \`FK_31a5bc02fdfc3d468bf56913938\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP FOREIGN KEY \`FK_55ced379094e24e43fabdbbc358\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`musicId\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`expectedAnswerId\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`gameToMusicId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD CONSTRAINT \`FK_7521db072a3928cd1d3b379e7c9\` FOREIGN KEY (\`gameToMusicId\`) REFERENCES \`game_to_music\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP FOREIGN KEY \`FK_7521db072a3928cd1d3b379e7c9\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` DROP COLUMN \`gameToMusicId\``);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`expectedAnswerId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD \`musicId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD CONSTRAINT \`FK_55ced379094e24e43fabdbbc358\` FOREIGN KEY (\`expectedAnswerId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`lobby_music\` ADD CONSTRAINT \`FK_31a5bc02fdfc3d468bf56913938\` FOREIGN KEY (\`musicId\`) REFERENCES \`music\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
