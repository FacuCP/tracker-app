import { GymExercise, createGymExercise } from '../entities/GymExercise';
import { GymExerciseRepository } from '../repositories/GymExerciseRepository';

export interface SaveGymExerciseInput {
  /** Si viene, se edita ese ejercicio; si no, se crea uno nuevo. */
  id?: string;
  routineId: string;
  name: string;
  sets: number;
  /** `null` = "al fallo", sin repeticiones fijas. */
  reps: number | null;
  /** Si es `true`, `reps` son segundos ("por tiempo") en vez de repeticiones. */
  isTimed: boolean;
  weightKg: number;
  /** Si no viene, se le asigna el siguiente puesto libre de la rutina. */
  position?: number;
  description?: string;
}

/** Crea o actualiza un ejercicio de una rutina. */
export class SaveGymExercise {
  constructor(
    private readonly repository: GymExerciseRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(input: SaveGymExerciseInput): Promise<GymExercise> {
    let position = input.position;
    if (position == null) {
      const existing = await this.repository.getForRoutine(input.routineId);
      position = existing.reduce((max, e) => Math.max(max, e.position), 0) + 1;
    }

    const exercise = createGymExercise({
      id: input.id ?? this.generateId(),
      routineId: input.routineId,
      name: input.name,
      sets: input.sets,
      reps: input.reps,
      isTimed: input.isTimed,
      weightKg: input.weightKg,
      position,
      description: input.description,
    });
    await this.repository.save(exercise);
    return exercise;
  }
}
