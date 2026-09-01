import { TrackerEntryRepository } from '../repositories/TrackerEntryRepository';
import { TrackerRepository } from '../repositories/TrackerRepository';

/** Borra un tracker y todos sus registros. */
export class DeleteTracker {
  constructor(
    private readonly trackers: TrackerRepository,
    private readonly entries: TrackerEntryRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.entries.deleteAllForTracker(id);
    await this.trackers.delete(id);
  }
}
