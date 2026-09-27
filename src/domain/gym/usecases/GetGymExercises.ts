import { GymExercise } from '../entities/GymExercise';
import { GymExerciseRepository } from '../repositories/GymExerciseRepository';

/** Ejercicios de una rutina, ordenados por puesto (y por nombre si empatan). */
export class GetGymExercises {
  constructor(private readonly repository: GymExerciseRepository) {}

  async execute(routineId: string): Promise<GymExercise[]> {
    const exercises = await this.repository.getForRoutine(routineId);
    return exercises.sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name, 'es'),
    );
  }
}
