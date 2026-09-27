import { GymProgressRepository } from '../repositories/GymProgressRepository';

/** Vuelve a 0 las series hechas de todos los ejercicios de una rutina. */
export class ResetGymRoutineProgress {
  constructor(private readonly progress: GymProgressRepository) {}

  async execute(routineId: string): Promise<void> {
    await this.progress.deleteAllForRoutine(routineId);
  }
}
