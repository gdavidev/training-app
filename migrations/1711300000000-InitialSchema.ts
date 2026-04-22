import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1711300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "muscle" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar NOT NULL,
        "key" varchar NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exercise" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar NOT NULL,
        "sets" varchar NOT NULL DEFAULT (''),
        "reps" varchar NOT NULL DEFAULT (''),
        "restTime" varchar NOT NULL DEFAULT (''),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exercise_muscles_muscle" (
        "exerciseId" integer NOT NULL,
        "muscleId" integer NOT NULL,
        PRIMARY KEY ("exerciseId", "muscleId"),
        CONSTRAINT "FK_exercise" FOREIGN KEY ("exerciseId") REFERENCES "exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_muscle" FOREIGN KEY ("muscleId") REFERENCES "muscle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "preset" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "preset_exercise" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "presetId" integer,
        "exerciseId" integer,
        "order" integer NOT NULL DEFAULT (0),
        CONSTRAINT "FK_preset" FOREIGN KEY ("presetId") REFERENCES "preset" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_preset_exercise" FOREIGN KEY ("exerciseId") REFERENCES "exercise" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "execution" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "startedAt" datetime,
        "isCompleted" boolean NOT NULL DEFAULT (0),
        "presetId" integer,
        "createAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_execution_preset" FOREIGN KEY ("presetId") REFERENCES "preset" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "execution_exercise" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "executionId" integer,
        "exerciseId" integer,
        "weight" float NOT NULL DEFAULT (0),
        "completed" boolean NOT NULL DEFAULT (0),
        "completedReps" varchar NOT NULL DEFAULT (''),
        "completedSets" integer NOT NULL DEFAULT (0),
        CONSTRAINT "FK_exec_exercise_execution" FOREIGN KEY ("executionId") REFERENCES "execution" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_exec_exercise_exercise" FOREIGN KEY ("exerciseId") REFERENCES "exercise" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_exercise_muscles_exerciseId" ON "exercise_muscles_muscle" ("exerciseId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_exercise_muscles_muscleId" ON "exercise_muscles_muscle" ("muscleId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exercise_muscles_muscleId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exercise_muscles_exerciseId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "execution_exercise"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "execution"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "preset_exercise"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "preset"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exercise_muscles_muscle"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exercise"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "muscle"`);
  }
}
