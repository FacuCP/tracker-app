import { GymExercise } from '../entities/GymExercise';
import { GymExerciseRepository } from '../repositories/GymExerciseRepository';

/** Reordena los ejercicios de una rutina según el orden de ids recibido. */
export class ReorderGymExercises {
  constructor(private readonly repository: GymExerciseRepository) {}

  async execute(routineId: string, orderedExerciseIds: string[]): Promise<void> {
    const current = await this.repository.getForRoutine(routineId);
    const byId = new Map(current.map((e) => [e.id, e]));

    const reordered: GymExercise[] = [];
    orderedExerciseIds.forEach((id, index) => {
      const exercise = byId.get(id);
      if (exercise) {
        reordered.push({ ...exercise, position: index + 1 });
      }
    });

    await this.repository.saveMany(reordered);
  }
}
