import { todayIso } from '../../../core/utils/date';
import { GymRoutine, createGymRoutine } from '../entities/GymRoutine';
import { GymRoutineRepository } from '../repositories/GymRoutineRepository';

/** Crea una rutina nueva (solo un nombre). */
export class CreateGymRoutine {
  constructor(
    private readonly repository: GymRoutineRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(name: string): Promise<GymRoutine> {
    const routine = createGymRoutine({ id: this.generateId(), name, createdAt: todayIso() });
    await this.repository.save(routine);
    return routine;
  }
}
