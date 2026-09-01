import { IsoDate } from '../../../core/utils/date';
import { TrackerEntry, createTrackerEntry } from '../entities/TrackerEntry';
import { TrackerEntryRepository } from '../repositories/TrackerEntryRepository';
import { TrackerRepository } from '../repositories/TrackerRepository';

export interface SaveTrackerEntryInput {
  trackerId: string;
  date: IsoDate;
  optionId?: string;
  value?: number;
}

/**
 * Crea o actualiza el registro de un día. Busca el tracker para validar que
 * la opción/el número tengan sentido para su tipo.
 */
export class SaveTrackerEntry {
  constructor(
    private readonly trackers: TrackerRepository,
    private readonly entries: TrackerEntryRepository,
  ) {}

  async execute(input: SaveTrackerEntryInput): Promise<TrackerEntry> {
    const tracker = await this.trackers.getById(input.trackerId);
    if (!tracker) {
      throw new Error('El tracker no existe');
    }

    const entry = createTrackerEntry(tracker, {
      date: input.date,
      optionId: input.optionId,
      value: input.value,
    });
    await this.entries.saveEntry(entry);
    return entry;
  }
}
