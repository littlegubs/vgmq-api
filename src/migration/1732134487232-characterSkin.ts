import { MigrationInterface, QueryRunner } from 'typeorm'

export class CharacterSkin1732134487232 implements MigrationInterface {
    name = 'CharacterSkin1732134487232'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`character_skin_image\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`type\` enum ('idle', 'typing', 'correct_answer', 'wrong_answer', 'wrong_guess', 'hint') NOT NULL DEFAULT 'idle', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`fileId\` int NULL, \`characterSkinId\` int NULL, \`characterSkinDraftId\` int NULL, UNIQUE INDEX \`REL_d5bea929f05296e63660821fed\` (\`fileId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `CREATE TABLE \`character_skin_draft\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`price\` int NOT NULL, \`type\` enum ('draft', 'pending', 'accepted', 'rejected') NOT NULL DEFAULT 'draft', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`artistId\` int NULL, \`skinId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `CREATE TABLE \`character_skin\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`enabled\` tinyint NOT NULL DEFAULT 0, \`showInShop\` tinyint NOT NULL DEFAULT 0, \`price\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `CREATE TABLE \`user_character_skins\` (\`userId\` int NOT NULL, \`characterSkinId\` int NOT NULL, INDEX \`IDX_e770374d841588a8ca8158719a\` (\`userId\`), INDEX \`IDX_029094bb947cb4e240ee530a4b\` (\`characterSkinId\`), PRIMARY KEY (\`userId\`, \`characterSkinId\`)) ENGINE=InnoDB`,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` DROP COLUMN \`characterSkinDraftId\``,
        )
        await queryRunner.query(`ALTER TABLE \`character_skin\` DROP COLUMN \`showInShop\``)
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` ADD \`characterSkinDraftId\` int NULL`,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin\` ADD \`showInShop\` tinyint NOT NULL DEFAULT 0`,
        )
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`selectedCharacterSkinId\` int NULL`)
        await queryRunner.query(
            `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_ee419842f71046d5cc7cbdd47c\` (\`selectedCharacterSkinId\`)`,
        )
        await queryRunner.query(
            `CREATE UNIQUE INDEX \`REL_ee419842f71046d5cc7cbdd47c\` ON \`user\` (\`selectedCharacterSkinId\`)`,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` ADD CONSTRAINT \`FK_d5bea929f05296e63660821fed9\` FOREIGN KEY (\`fileId\`) REFERENCES \`file\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` ADD CONSTRAINT \`FK_7858535385e89ca22170c763fac\` FOREIGN KEY (\`characterSkinId\`) REFERENCES \`character_skin\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` ADD CONSTRAINT \`FK_b000b0c4439ce255f1b4c7d76c3\` FOREIGN KEY (\`characterSkinDraftId\`) REFERENCES \`character_skin_draft\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_draft\` ADD CONSTRAINT \`FK_fd13dee11176e696d2604648b33\` FOREIGN KEY (\`artistId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_draft\` ADD CONSTRAINT \`FK_65dc52ab69cf5b6fe5498dcb70c\` FOREIGN KEY (\`skinId\`) REFERENCES \`character_skin\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_ee419842f71046d5cc7cbdd47ca\` FOREIGN KEY (\`selectedCharacterSkinId\`) REFERENCES \`character_skin\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
        await queryRunner.query(
            `ALTER TABLE \`user_character_skins\` ADD CONSTRAINT \`FK_e770374d841588a8ca8158719a0\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
        )
        await queryRunner.query(
            `ALTER TABLE \`user_character_skins\` ADD CONSTRAINT \`FK_029094bb947cb4e240ee530a4bf\` FOREIGN KEY (\`characterSkinId\`) REFERENCES \`character_skin\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`user_character_skins\` DROP FOREIGN KEY \`FK_029094bb947cb4e240ee530a4bf\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`user_character_skins\` DROP FOREIGN KEY \`FK_e770374d841588a8ca8158719a0\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_ee419842f71046d5cc7cbdd47ca\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_draft\` DROP FOREIGN KEY \`FK_65dc52ab69cf5b6fe5498dcb70c\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_draft\` DROP FOREIGN KEY \`FK_fd13dee11176e696d2604648b33\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` DROP FOREIGN KEY \`FK_b000b0c4439ce255f1b4c7d76c3\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` DROP FOREIGN KEY \`FK_7858535385e89ca22170c763fac\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` DROP FOREIGN KEY \`FK_d5bea929f05296e63660821fed9\``,
        )
        await queryRunner.query(`DROP INDEX \`REL_ee419842f71046d5cc7cbdd47c\` ON \`user\``)
        await queryRunner.query(
            `ALTER TABLE \`user\` DROP INDEX \`IDX_ee419842f71046d5cc7cbdd47c\``,
        )
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`selectedCharacterSkinId\``)
        await queryRunner.query(`ALTER TABLE \`character_skin\` DROP COLUMN \`showInShop\``)
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` DROP COLUMN \`characterSkinDraftId\``,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin\` ADD \`showInShop\` tinyint NOT NULL DEFAULT 0`,
        )
        await queryRunner.query(
            `ALTER TABLE \`character_skin_image\` ADD \`characterSkinDraftId\` int NULL`,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_029094bb947cb4e240ee530a4b\` ON \`user_character_skins\``,
        )
        await queryRunner.query(
            `DROP INDEX \`IDX_e770374d841588a8ca8158719a\` ON \`user_character_skins\``,
        )
        await queryRunner.query(`DROP TABLE \`user_character_skins\``)
        await queryRunner.query(`DROP TABLE \`character_skin\``)
        await queryRunner.query(`DROP TABLE \`character_skin_draft\``)
        await queryRunner.query(
            `DROP INDEX \`REL_d5bea929f05296e63660821fed\` ON \`character_skin_image\``,
        )
        await queryRunner.query(`DROP TABLE \`character_skin_image\``)
    }
}
