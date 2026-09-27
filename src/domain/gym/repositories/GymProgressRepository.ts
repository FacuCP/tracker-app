import { GymExerciseProgress } from '../entities/GymProgress';

/** Puerto para el progreso (series hechas) de los ejercicios. */
export interface GymProgressRepository {
  getForRoutine(routineId: string): Promise<Record<string, GymExerciseProgress>>;
  save(progress: GymExerciseProgress): Promise<void>;
  deleteForExercise(routineId: string, exerciseId: string): Promise<void>;
  deleteAllForRoutine(routineId: string): Promise<void>;
}
