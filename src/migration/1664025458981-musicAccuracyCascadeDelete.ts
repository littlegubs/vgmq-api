import { MigrationInterface, QueryRunner } from 'typeorm'

export class musicAccuracyCascadeDelete1664025458981 implements MigrationInterface {
    name = 'musicAccuracyCascadeDelete1664025458981'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`music_accuracy\` DROP FOREIGN KEY \`FK_8704413205aaac7825318ac0bf2\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`music_accuracy\` ADD CONSTRAINT \`FK_8704413205aaac7825318ac0bf2\` FOREIGN KEY (\`gameToMusicId\`) REFERENCES \`game_to_music\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`music_accuracy\` DROP FOREIGN KEY \`FK_8704413205aaac7825318ac0bf2\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`music_accuracy\` ADD CONSTRAINT \`FK_8704413205aaac7825318ac0bf2\` FOREIGN KEY (\`gameToMusicId\`) REFERENCES \`game_to_music\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
    }
}
