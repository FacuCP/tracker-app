import { IsoDate, startOfWeek, toIsoDate } from '../../../core/utils/date';
import { GymExercise } from './GymExercise';

/**
 * Progreso de un ejercicio en el **ciclo actual** (la semana en curso, que
 * empieza el lunes). `completedSets` son las series ya hechas. No hay que
 * "resetear" nada a mano: si `cycleStart` no es el de la semana actual, el
 * progreso se trata como si fuera 0 (ver `resolveProgress`). Así "se resetea
 * los domingos a la noche" sin ningún job en segundo plano.
 */
export interface GymExerciseProgress {
  readonly routineId: string;
  readonly exerciseId: string;
  readonly cycleStart: IsoDate;
  readonly completedSets: number;
}

/** Lunes (inicio de semana) del ciclo actual. */
export function currentCycleStart(now: Date = new Date()): IsoDate {
  return toIsoDate(startOfWeek(now));
}

/** Series completadas de un progreso, o 0 si es de un ciclo anterior. */
export function resolveCompletedSets(
  progress: GymExerciseProgress | undefined,
  cycleStart: IsoDate,
): number {
  if (!progress || progress.cycleStart !== cycleStart) return 0;
  return progress.completedSets;
}

export function isExerciseDone(exercise: GymExercise, completedSets: number): boolean {
  return completedSets >= exercise.sets;
}
