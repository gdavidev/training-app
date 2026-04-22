#!/usr/bin/env bun
/**
 * Developer utility: export a davi-training SQLite database to JSON.
 *
 * Usage:
 *   bun scripts/export-db.ts <path-to-db-file> [output.json]
 *
 * If no output path is given the JSON is printed to stdout.
 *
 * The output format matches the in-app JSON export so the resulting file
 * can be imported back into the app via the "Import data" button.
 */

import { Database } from 'bun:sqlite';
import { writeFileSync } from 'fs';

const [, , dbPath, outputPath] = process.argv;

if (!dbPath) {
  console.error('Usage: bun scripts/export-db.ts <path-to-db-file> [output.json]');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

function all<T = Record<string, unknown>>(sql: string): T[] {
  return db.query(sql).all() as T[];
}

const muscles = all(`SELECT id, name, key FROM muscle`);

const exercises = all(`SELECT id, name, sets, reps, rest_time as restTime, weighting_method as weightingMethod, input_mode as inputMode FROM exercise`).map(
  (ex: any) => ({
    ...ex,
    muscles: all(
      `SELECT m.id, m.name, m.key
       FROM muscle m
       JOIN exercise_muscles_muscle em ON em.muscle_id = m.id
       WHERE em.exercise_id = ${ex.id}`,
    ),
  }),
);

const cardioExercises = all(`SELECT id, name, duration FROM cardio_exercise`);

const presets = all(`SELECT id, name FROM preset`).map((p: any) => ({
  ...p,
  exercises: all(
    `SELECT pe.id, pe.order, e.id as ex_id, e.name as ex_name
     FROM preset_exercise pe
     JOIN exercise e ON e.id = pe.exercise_id
     WHERE pe.preset_id = ${p.id}`,
  ).map((row: any) => ({
    id: row.id,
    order: row.order,
    exercise: { id: row.ex_id, name: row.ex_name },
  })),
  cardioExercises: all(
    `SELECT pce.id, pce.order, ce.id as ce_id, ce.name as ce_name
     FROM preset_cardio_exercise pce
     JOIN cardio_exercise ce ON ce.id = pce.cardio_exercise_id
     WHERE pce.preset_id = ${p.id}`,
  ).map((row: any) => ({
    id: row.id,
    order: row.order,
    cardioExercise: { id: row.ce_id, name: row.ce_name },
  })),
}));

const executions = all(
  `SELECT e.id, e.started_at as startedAt, e.is_completed as isCompleted, e.create_at as createAt,
          p.id as preset_id, p.name as preset_name
   FROM execution e
   LEFT JOIN preset p ON p.id = e.preset_id`,
).map((ex: any) => ({
  id: ex.id,
  startedAt: ex.startedAt,
  isCompleted: Boolean(ex.isCompleted),
  createAt: ex.createAt,
  preset: ex.preset_id ? { id: ex.preset_id, name: ex.preset_name } : null,
  exercises: all(
    `SELECT ee.id, ee.weight, ee.completed, ee.completed_reps as completedReps,
            ee.completed_sets as completedSets, e.id as ex_id, e.name as ex_name
     FROM execution_exercise ee
     JOIN exercise e ON e.id = ee.exercise_id
     WHERE ee.execution_id = ${ex.id}`,
  ).map((row: any) => ({
    id: row.id,
    weight: row.weight,
    completed: Boolean(row.completed),
    completedReps: row.completedReps,
    completedSets: row.completedSets,
    exercise: { id: row.ex_id, name: row.ex_name },
  })),
  cardioExercises: all(
    `SELECT ece.id, ece.completed, ece.elapsed_seconds as elapsedSeconds,
            ce.id as ce_id, ce.name as ce_name
     FROM execution_cardio_exercise ece
     JOIN cardio_exercise ce ON ce.id = ece.cardio_exercise_id
     WHERE ece.execution_id = ${ex.id}`,
  ).map((row: any) => ({
    id: row.id,
    completed: Boolean(row.completed),
    elapsedSeconds: row.elapsedSeconds,
    cardioExercise: { id: row.ce_id, name: row.ce_name },
  })),
}));

db.close();

const data = { muscles, exercises, cardioExercises, presets, executions };
const json = JSON.stringify(data, null, 2);

if (outputPath) {
  writeFileSync(outputPath, json, 'utf8');
  console.log(`Exported to ${outputPath}`);
  console.log(
    `  muscles: ${muscles.length}, exercises: ${exercises.length}, cardioExercises: ${cardioExercises.length}, presets: ${presets.length}, executions: ${executions.length}`,
  );
} else {
  process.stdout.write(json + '\n');
}
