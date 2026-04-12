import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWeightingAndHold1711600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN "weightingMethod" varchar NOT NULL DEFAULT 'single'`
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD COLUMN "inputMode" varchar NOT NULL DEFAULT 'reps'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN easily; these are additive-only
  }
}
