import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameCardioDuration1711700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cardio_exercise" RENAME COLUMN "duration" TO "maxDuration"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cardio_exercise" RENAME COLUMN "maxDuration" TO "duration"
    `);
  }
}
