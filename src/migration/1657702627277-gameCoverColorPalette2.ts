import { MigrationInterface, QueryRunner } from "typeorm";

export class gameCoverColorPalette21657702627277 implements MigrationInterface {
    name = 'gameCoverColorPalette21657702627277'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_d47ea6c492f3d81b08814671ef\` ON \`cover\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_d47ea6c492f3d81b08814671ef\` ON \`cover\` (\`colorPaletteId\`)`);
    }

}
