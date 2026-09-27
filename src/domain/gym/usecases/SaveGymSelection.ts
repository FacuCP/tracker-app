import { GymSelectionRepository } from '../repositories/GymSelectionRepository';

/** Elige (o limpia, con null) la rutina para hoy. */
export class SaveGymSelection {
  constructor(private readonly repository: GymSelectionRepository) {}

  execute(routineId: string | null): Promise<void> {
    return this.repository.setSelectedRoutineId(routineId);
  }
}
