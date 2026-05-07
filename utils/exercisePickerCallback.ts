import { CardioExercise } from '../entities/CardioExercise';
import { Exercise } from '../entities/Exercise';

type CreatedExerciseCallback = (
  exercise: Exercise | CardioExercise,
  type: 'strength' | 'cardio',
) => void;

let pendingCallback: CreatedExerciseCallback | null = null;

export function setPendingExerciseCallback(cb: CreatedExerciseCallback) {
  pendingCallback = cb;
}

export function callPendingExerciseCallback(
  exercise: Exercise | CardioExercise,
  type: 'strength' | 'cardio',
) {
  if (pendingCallback) {
    pendingCallback(exercise, type);
    pendingCallback = null;
  }
}

export function clearPendingExerciseCallback() {
  pendingCallback = null;
}
