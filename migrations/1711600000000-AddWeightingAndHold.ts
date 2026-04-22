import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWeightingAndHold1711600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableInfo: Array<{ name: string }> = await queryRunner.query(
      `PRAGMA table_info("exercise")`
    );
    const existingColumns = tableInfo.map((col) => col.name);

    if (!existingColumns.includes("weightingMethod")) {
      await queryRunner.query(
        `ALTER TABLE "exercise" ADD COLUMN "weightingMethod" varchar NOT NULL DEFAULT 'single'`
      );
    }
    if (!existingColumns.includes("inputMode")) {
      await queryRunner.query(
        `ALTER TABLE "exercise" ADD COLUMN "inputMode" varchar NOT NULL DEFAULT 'reps'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN easily; these are additive-only
  }
}
