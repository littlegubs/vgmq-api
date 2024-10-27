import { MigrationInterface, QueryRunner } from "typeorm";

export class DerivedMusic1730026184088 implements MigrationInterface {
    name = 'DerivedMusic1730026184088'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_15f33d690abc21fff6ec4910bc9\``);
        await queryRunner.query(`DROP INDEX \`IDX_8299cbcd62fd1a04f84617885b\` ON \`lobby_user\``);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_15f33d690abc21fff6ec4910bc9\` FOREIGN KEY (\`originalGameToMusicId\`) REFERENCES \`game_to_music\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_15f33d690abc21fff6ec4910bc9\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_8299cbcd62fd1a04f84617885b\` ON \`lobby_user\` (\`userId\`)`);
        await queryRunner.query(`ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_15f33d690abc21fff6ec4910bc9\` FOREIGN KEY (\`originalGameToMusicId\`) REFERENCES \`game_to_music\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
