import { GymExercise } from '../entities/GymExercise';

/** Puerto para los ejercicios de las rutinas de gimnasio. */
export interface GymExerciseRepository {
  getForRoutine(routineId: string): Promise<GymExercise[]>;
  save(exercise: GymExercise): Promise<void>;
  /** Guarda varios ejercicios en una sola escritura (p. ej. al reordenar). */
  saveMany(exercises: GymExercise[]): Promise<void>;
  delete(routineId: string, exerciseId: string): Promise<void>;
  /** Borra todos los ejercicios de una rutina (al eliminar la rutina). */
  deleteAllForRoutine(routineId: string): Promise<void>;
}
