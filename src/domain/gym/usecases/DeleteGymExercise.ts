import { GymExerciseRepository } from '../repositories/GymExerciseRepository';
import { GymProgressRepository } from '../repositories/GymProgressRepository';

/** Borra un ejercicio de una rutina y su progreso. */
export class DeleteGymExercise {
  constructor(
    private readonly exercises: GymExerciseRepository,
    private readonly progress: GymProgressRepository,
  ) {}

  async execute(routineId: string, exerciseId: string): Promise<void> {
    await this.exercises.delete(routineId, exerciseId);
    await this.progress.deleteForExercise(routineId, exerciseId);
  }
}
