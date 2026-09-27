import { isExerciseDone } from '../entities/GymProgress';
import { GymSession, GymSessionExercise } from '../entities/GymSession';
import { GymRoutineRepository } from '../repositories/GymRoutineRepository';
import { GetGymExercises } from './GetGymExercises';
import { GetGymProgress } from './GetGymProgress';

/**
 * Arma el estado de una rutina en el ciclo actual: sus ejercicios (en orden de
 * puesto) con el progreso resuelto, cuál sigue y si ya está completa. Lo usa
 * tanto el cuadro "Seleccionar rutina para hoy" como el detalle de la rutina.
 */
export class GetGymSession {
  constructor(
    private readonly routines: GymRoutineRepository,
    private readonly getExercises: GetGymExercises,
    private readonly getProgress: GetGymProgress,
  ) {}

  async execute(routineId: string): Promise<GymSession | null> {
    const routine = await this.routines.getById(routineId);
    if (!routine) return null;

    const [sorted, progressByExercise] = await Promise.all([
      this.getExercises.execute(routineId),
      this.getProgress.execute(routineId),
    ]);

    const exercises: GymSessionExercise[] = sorted.map((exercise) => {
      const completedSets = progressByExercise[exercise.id] ?? 0;
      return { exercise, completedSets, done: isExerciseDone(exercise, completedSets) };
    });

    const currentExercise = exercises.find((e) => !e.done) ?? null;
    const routineDone = exercises.length > 0 && currentExercise == null;

    return { routine, exercises, currentExercise, routineDone };
  }
}
