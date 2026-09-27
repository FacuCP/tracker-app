import { GymExercise } from './GymExercise';
import { GymRoutine } from './GymRoutine';

/** Un ejercicio de la rutina con su progreso resuelto para el ciclo actual. */
export interface GymSessionExercise {
  readonly exercise: GymExercise;
  readonly completedSets: number;
  readonly done: boolean;
}

/**
 * Estado de una rutina en el ciclo (semana) actual: sus ejercicios en orden,
 * cuál es el que sigue (el primero no completado) y si ya se terminaron todos.
 */
export interface GymSession {
  readonly routine: GymRoutine;
  readonly exercises: readonly GymSessionExercise[];
  /** El primer ejercicio sin terminar, o null si no quedan (rutina completa o sin ejercicios). */
  readonly currentExercise: GymSessionExercise | null;
  readonly routineDone: boolean;
}
