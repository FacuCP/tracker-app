import { GymSelectionRepository } from '../repositories/GymSelectionRepository';

/** Devuelve el id de la rutina elegida para hoy, o null si no hay ninguna. */
export class GetGymSelection {
  constructor(private readonly repository: GymSelectionRepository) {}

  execute(): Promise<string | null> {
    return this.repository.getSelectedRoutineId();
  }
}
