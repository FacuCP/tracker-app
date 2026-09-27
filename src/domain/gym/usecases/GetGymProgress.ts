import { currentCycleStart, resolveCompletedSets } from '../entities/GymProgress';
import { GymProgressRepository } from '../repositories/GymProgressRepository';

/**
 * Series completadas por ejercicio en el **ciclo actual** (semana en curso).
 * Los ejercicios sin progreso, o con progreso de una semana anterior, no
 * aparecen (se consideran 0).
 */
export class GetGymProgress {
  constructor(private readonly repository: GymProgressRepository) {}

  async execute(routineId: string): Promise<Record<string, number>> {
    const stored = await this.repository.getForRoutine(routineId);
    const cycleStart = currentCycleStart();
    const result: Record<string, number> = {};
    for (const [exerciseId, progress] of Object.entries(stored)) {
      const completed = resolveCompletedSets(progress, cycleStart);
      if (completed > 0) result[exerciseId] = completed;
    }
    return result;
  }
}
