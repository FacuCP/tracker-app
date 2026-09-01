import { Tracker } from '../entities/Tracker';
import { TrackerRepository } from '../repositories/TrackerRepository';

/** Devuelve un tracker por id, o null si no existe. */
export class GetTracker {
  constructor(private readonly repository: TrackerRepository) {}

  execute(id: string): Promise<Tracker | null> {
    return this.repository.getById(id);
  }
}
