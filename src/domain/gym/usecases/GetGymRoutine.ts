import { GymRoutine } from '../entities/GymRoutine';
import { GymRoutineRepository } from '../repositories/GymRoutineRepository';

/** Devuelve una rutina por id, o null si no existe. */
export class GetGymRoutine {
  constructor(private readonly repository: GymRoutineRepository) {}

  execute(id: string): Promise<GymRoutine | null> {
    return this.repository.getById(id);
  }
}
