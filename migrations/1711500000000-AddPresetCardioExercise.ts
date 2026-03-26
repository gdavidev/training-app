import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPresetCardioExercise1711500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "preset_cardio_exercise" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "presetId" integer,
        "cardioExerciseId" integer,
        "order" integer NOT NULL DEFAULT (0),
        CONSTRAINT "FK_preset_cardio_preset" FOREIGN KEY ("presetId") REFERENCES "preset" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_preset_cardio_cardio_exercise" FOREIGN KEY ("cardioExerciseId") REFERENCES "cardio_exercise" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "preset_cardio_exercise"`);
  }
}
