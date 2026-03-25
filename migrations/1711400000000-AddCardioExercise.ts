import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCardioExercise1711400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cardio_exercise" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar NOT NULL,
        "duration" integer NOT NULL DEFAULT (0),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "execution_cardio_exercise" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "executionId" integer,
        "cardioExerciseId" integer,
        "completed" boolean NOT NULL DEFAULT (0),
        "elapsedSeconds" integer NOT NULL DEFAULT (0),
        CONSTRAINT "FK_exec_cardio_execution" FOREIGN KEY ("executionId") REFERENCES "execution" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_exec_cardio_cardio_exercise" FOREIGN KEY ("cardioExerciseId") REFERENCES "cardio_exercise" ("id") ON DELETE CASCADE
      )
    `);

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
    await queryRunner.query(`DROP TABLE IF EXISTS "execution_cardio_exercise"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cardio_exercise"`);
  }
}
