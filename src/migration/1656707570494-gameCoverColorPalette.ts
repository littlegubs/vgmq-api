import { MigrationInterface, QueryRunner } from "typeorm";

export class gameCoverColorPalette1656707570494 implements MigrationInterface {
    name = 'gameCoverColorPalette1656707570494'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`color_palette\` (\`id\` int NOT NULL AUTO_INCREMENT, \`vibrantHex\` varchar(255) NOT NULL, \`mutedHex\` varchar(255) NOT NULL, \`darkMutedHex\` varchar(255) NOT NULL, \`darkVibrantHex\` varchar(255) NOT NULL, \`lightMutedHex\` varchar(255) NOT NULL, \`lightVibrantHex\` varchar(255) NOT NULL, \`backgroundColorHex\` varchar(255) NOT NULL, \`colorHex\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`cover\` ADD \`colorPaletteId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`cover\` ADD UNIQUE INDEX \`IDX_d47ea6c492f3d81b08814671ef\` (\`colorPaletteId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_d47ea6c492f3d81b08814671ef\` ON \`cover\` (\`colorPaletteId\`)`);
        await queryRunner.query(`ALTER TABLE \`cover\` ADD CONSTRAINT \`FK_d47ea6c492f3d81b08814671ef1\` FOREIGN KEY (\`colorPaletteId\`) REFERENCES \`color_palette\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cover\` DROP FOREIGN KEY \`FK_d47ea6c492f3d81b08814671ef1\``);
        await queryRunner.query(`DROP INDEX \`REL_d47ea6c492f3d81b08814671ef\` ON \`cover\``);
        await queryRunner.query(`ALTER TABLE \`cover\` DROP INDEX \`IDX_d47ea6c492f3d81b08814671ef\``);
        await queryRunner.query(`ALTER TABLE \`cover\` DROP COLUMN \`colorPaletteId\``);
        await queryRunner.query(`DROP TABLE \`color_palette\``);
    }

}
