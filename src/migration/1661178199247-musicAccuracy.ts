import { MigrationInterface, QueryRunner } from 'typeorm'

export class musicAccuracy1661178199247 implements MigrationInterface {
    name = 'musicAccuracy1661178199247'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`music_accuracy\` (\`id\` int NOT NULL AUTO_INCREMENT, \`correctAnswer\` tinyint NOT NULL, \`playedTheGame\` tinyint NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`gameToMusicId\` int NULL, \`userId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `ALTER TABLE \`music_accuracy\` ADD CONSTRAINT \`FK_8704413205aaac7825318ac0bf2\` FOREIGN KEY (\`gameToMusicId\`) REFERENCES \`game_to_music\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`music_accuracy\` ADD CONSTRAINT \`FK_aefb5537dd198e25026353c15a8\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`music_accuracy\` DROP FOREIGN KEY \`FK_aefb5537dd198e25026353c15a8\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`music_accuracy\` DROP FOREIGN KEY \`FK_8704413205aaac7825318ac0bf2\``,
        )
        await queryRunner.query(
            `DROP INDEX \`REL_aefb5537dd198e25026353c15a\` ON \`music_accuracy\``,
        )
        await queryRunner.query(`DROP TABLE \`music_accuracy\``)
    }
}
