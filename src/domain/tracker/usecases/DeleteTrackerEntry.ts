import { IsoDate } from '../../../core/utils/date';
import { TrackerEntryRepository } from '../repositories/TrackerEntryRepository';

/** Borra el registro de un día de un tracker. */
export class DeleteTrackerEntry {
  constructor(private readonly repository: TrackerEntryRepository) {}

  execute(trackerId: string, date: IsoDate): Promise<void> {
    return this.repository.deleteEntry(trackerId, date);
  }
}
