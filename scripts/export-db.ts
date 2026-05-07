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

function columns(table: string): Set<string> {
  return new Set(all<{ name: string }>(`PRAGMA table_info(${table})`).map((c) => c.name));
}

// Detect schema version: old DBs use camelCase columns, new ones use snake_case
const snakeCase = columns('exercise').has('rest_time');

function c(snake: string, camel: string, alias?: string): string {
  const name = snakeCase ? snake : camel;
  const as = alias ?? camel;
  return name === as ? name : `${name} as ${as}`;
}

const muscles = all(`SELECT id, name, key FROM muscle`);

const em = snakeCase
  ? { exerciseId: 'exercise_id', muscleId: 'muscle_id' }
  : { exerciseId: 'exerciseId', muscleId: 'muscleId' };

const exercises = all(
  `SELECT id, name, sets, reps,
    ${c('rest_time', 'restTime')},
    ${c('weighting_method', 'weightingMethod')},
    ${c('input_mode', 'inputMode')}
   FROM exercise`,
).map((ex: any) => ({
  ...ex,
  muscles: all(
    `SELECT m.id, m.name, m.key
     FROM muscle m
     JOIN exercise_muscles_muscle em ON em.${em.exerciseId} = m.id
     WHERE em.${em.exerciseId} = ${ex.id}`,
  ),
}));

const cardioCol = columns('cardio_exercise');
const durationExpr = cardioCol.has('maxDuration')
  ? 'maxDuration'
  : cardioCol.has('max_duration')
    ? 'max_duration as maxDuration'
    : 'duration as maxDuration';

const cardioExercises = all(`SELECT id, name, ${durationExpr} FROM cardio_exercise`);

const pe = snakeCase
  ? { presetId: 'preset_id', exerciseId: 'exercise_id' }
  : { presetId: 'presetId', exerciseId: 'exerciseId' };
const pce = snakeCase
  ? { presetId: 'preset_id', cardioExerciseId: 'cardio_exercise_id' }
  : { presetId: 'presetId', cardioExerciseId: 'cardioExerciseId' };

const presets = all(`SELECT id, name FROM preset`).map((p: any) => ({
  ...p,
  exercises: all(
    `SELECT pe.id, pe."order", e.id as ex_id, e.name as ex_name
     FROM preset_exercise pe
     JOIN exercise e ON e.id = pe.${pe.exerciseId}
     WHERE pe.${pe.presetId} = ${p.id}`,
  ).map((row: any) => ({
    id: row.id,
    order: row.order,
    exercise: { id: row.ex_id, name: row.ex_name },
  })),
  cardioExercises: all(
    `SELECT pce.id, pce."order", ce.id as ce_id, ce.name as ce_name
     FROM preset_cardio_exercise pce
     JOIN cardio_exercise ce ON ce.id = pce.${pce.cardioExerciseId}
     WHERE pce.${pce.presetId} = ${p.id}`,
  ).map((row: any) => ({
    id: row.id,
    order: row.order,
    cardioExercise: { id: row.ce_id, name: row.ce_name },
  })),
}));

const exec = snakeCase
  ? { presetId: 'preset_id', startedAt: 'started_at', isCompleted: 'is_completed', createAt: 'create_at' }
  : { presetId: 'presetId', startedAt: 'startedAt', isCompleted: 'isCompleted', createAt: 'createAt' };
const ee = snakeCase
  ? { executionId: 'execution_id', exerciseId: 'exercise_id', completedReps: 'completed_reps', completedSets: 'completed_sets' }
  : { executionId: 'executionId', exerciseId: 'exerciseId', completedReps: 'completedReps', completedSets: 'completedSets' };
const ece = snakeCase
  ? { executionId: 'execution_id', cardioExerciseId: 'cardio_exercise_id', elapsedSeconds: 'elapsed_seconds' }
  : { executionId: 'executionId', cardioExerciseId: 'cardioExerciseId', elapsedSeconds: 'elapsedSeconds' };

const executions = all(
  `SELECT e.id,
          e.${exec.startedAt} as startedAt,
          e.${exec.isCompleted} as isCompleted,
          e.${exec.createAt} as createAt,
          p.id as preset_id, p.name as preset_name
   FROM execution e
   LEFT JOIN preset p ON p.id = e.${exec.presetId}`,
).map((ex: any) => ({
  id: ex.id,
  startedAt: ex.startedAt,
  isCompleted: Boolean(ex.isCompleted),
  createAt: ex.createAt,
  preset: ex.preset_id ? { id: ex.preset_id, name: ex.preset_name } : null,
  exercises: all(
    `SELECT ee.id, ee.weight, ee.completed,
            ee.${ee.completedReps} as completedReps,
            ee.${ee.completedSets} as completedSets,
            e.id as ex_id, e.name as ex_name
     FROM execution_exercise ee
     JOIN exercise e ON e.id = ee.${ee.exerciseId}
     WHERE ee.${ee.executionId} = ${ex.id}`,
  ).map((row: any) => ({
    id: row.id,
    weight: row.weight,
    completed: Boolean(row.completed),
    completedReps: row.completedReps,
    completedSets: row.completedSets,
    exercise: { id: row.ex_id, name: row.ex_name },
  })),
  cardioExercises: all(
    `SELECT ece.id, ece.completed,
            ece.${ece.elapsedSeconds} as elapsedSeconds,
            ce.id as ce_id, ce.name as ce_name
     FROM execution_cardio_exercise ece
     JOIN cardio_exercise ce ON ce.id = ece.${ece.cardioExerciseId}
     WHERE ece.${ece.executionId} = ${ex.id}`,
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
