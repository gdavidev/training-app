import { ExecutionExercise } from '../entities/ExecutionExercise';
import { ExecutionCardioExercise } from '../entities/ExecutionCardioExercise';

export type ExerciseStatus = 'finished' | 'unfinished' | 'skipped';

export function getStrengthExerciseStatus(ee: ExecutionExercise): ExerciseStatus {
  if (ee.completed) return 'finished';
  if ((ee.completedSets ?? 0) > 0) return 'unfinished';
  return 'skipped';
}

export function getCardioExerciseStatus(ce: ExecutionCardioExercise): ExerciseStatus {
  if (ce.completed) return 'finished';
  if ((ce.elapsedSeconds ?? 0) > 0) return 'unfinished';
  return 'skipped';
}

export const STATUS_CONFIG: Record<ExerciseStatus, { label: string; color: string; icon: string }> = {
  finished: { label: 'Finished', color: '#51cf66', icon: 'checkmark-circle' },
  unfinished: { label: 'Partial', color: '#ffa94d', icon: 'ellipsis-horizontal-circle' },
  skipped: { label: 'Skipped', color: '#666', icon: 'remove-circle' },
};
