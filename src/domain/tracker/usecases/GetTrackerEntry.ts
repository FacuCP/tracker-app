import { IsoDate } from '../../../core/utils/date';
import { TrackerEntry } from '../entities/TrackerEntry';
import { TrackerEntryRepository } from '../repositories/TrackerEntryRepository';

/** Registro de un día de un tracker, o null si ese día no tiene. */
export class GetTrackerEntry {
  constructor(private readonly repository: TrackerEntryRepository) {}

  execute(trackerId: string, date: IsoDate): Promise<TrackerEntry | null> {
    return this.repository.getEntry(trackerId, date);
  }
}
