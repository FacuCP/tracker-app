import { currentCycleStart } from '../entities/GymProgress';
import { GymExerciseRepository } from '../repositories/GymExerciseRepository';
import { GymProgressRepository } from '../repositories/GymProgressRepository';

/**
 * Fija cuántas series de un ejercicio están hechas, en el ciclo (semana)
 * actual — clampado entre 0 y las series objetivo del ejercicio. Como siempre
 * guarda con el `cycleStart` de hoy, si el progreso guardado era de una semana
 * anterior queda pisado por el nuevo (así funciona el reseteo semanal).
 */
export class SetGymSetCount {
  constructor(
    private readonly exercises: GymExerciseRepository,
    private readonly progress: GymProgressRepository,
  ) {}

  async execute(routineId: string, exerciseId: string, count: number): Promise<number> {
    const exercises = await this.exercises.getForRoutine(routineId);
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) {
      throw new Error('El ejercicio no existe');
    }

    const clamped = Math.max(0, Math.min(exercise.sets, Math.round(count)));
    await this.progress.save({
      routineId,
      exerciseId,
      cycleStart: currentCycleStart(),
      completedSets: clamped,
    });
    return clamped;
  }
}
