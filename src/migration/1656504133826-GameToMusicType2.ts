import {MigrationInterface, QueryRunner} from "typeorm";

export class GameToMusicType21656504133826 implements MigrationInterface {
    name = 'GameToMusicType21656504133826'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_32366a3e30181161e560cb23d32\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_32366a3e30181161e560cb23d32\` FOREIGN KEY (\`musicId\`) REFERENCES \`music\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_32366a3e30181161e560cb23d32\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_32366a3e30181161e560cb23d32\` FOREIGN KEY (\`musicId\`) REFERENCES \`music\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
