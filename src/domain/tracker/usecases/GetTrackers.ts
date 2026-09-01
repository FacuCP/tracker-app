import { Tracker } from '../entities/Tracker';
import { TrackerRepository } from '../repositories/TrackerRepository';

/** Lista los trackers del usuario, del más viejo al más nuevo. */
export class GetTrackers {
  constructor(private readonly repository: TrackerRepository) {}

  async execute(): Promise<Tracker[]> {
    const trackers = await this.repository.getAll();
    return trackers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
