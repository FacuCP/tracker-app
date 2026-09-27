import { GymRoutine } from '../entities/GymRoutine';
import { GymRoutineRepository } from '../repositories/GymRoutineRepository';

/** Lista las rutinas del usuario, del más viejo al más nuevo. */
export class GetGymRoutines {
  constructor(private readonly repository: GymRoutineRepository) {}

  async execute(): Promise<GymRoutine[]> {
    const routines = await this.repository.getAll();
    return routines.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
