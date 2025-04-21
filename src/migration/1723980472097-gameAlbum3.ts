import { MigrationInterface, QueryRunner } from 'typeorm'

export class Gameeeee1723980472097 implements MigrationInterface {
    name = 'Gameeeee1723980472097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_42949c7554e21d086a76b6c35fa\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_42949c7554e21d086a76b6c35fa\` FOREIGN KEY (\`albumId\`) REFERENCES \`game_album\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`game_to_music\` DROP FOREIGN KEY \`FK_42949c7554e21d086a76b6c35fa\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`game_to_music\` ADD CONSTRAINT \`FK_42949c7554e21d086a76b6c35fa\` FOREIGN KEY (\`albumId\`) REFERENCES \`game_album\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
    }
}
