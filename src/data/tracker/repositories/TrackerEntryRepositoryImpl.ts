import { IsoDate } from '../../../core/utils/date';
import { TrackerEntry } from '../../../domain/tracker/entities/TrackerEntry';
import { TrackerEntryRepository } from '../../../domain/tracker/repositories/TrackerEntryRepository';
import { TrackerEntryLocalDataSource } from '../datasources/TrackerEntryLocalDataSource';
import { trackerEntryFromDto, trackerEntryToDto } from '../dto/TrackerEntryDto';

export class TrackerEntryRepositoryImpl implements TrackerEntryRepository {
  constructor(private readonly local: TrackerEntryLocalDataSource) {}

  async getEntry(trackerId: string, date: IsoDate): Promise<TrackerEntry | null> {
    const all = await this.local.readAll();
    const dto = all[trackerId]?.[date];
    return dto ? trackerEntryFromDto(dto) : null;
  }

  async getEntriesInRange(trackerId: string, start: IsoDate, end: IsoDate): Promise<TrackerEntry[]> {
    const all = await this.local.readAll();
    const forTracker = all[trackerId] ?? {};
    return Object.values(forTracker)
      .filter((dto) => dto.date >= start && dto.date <= end)
      .map(trackerEntryFromDto)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveEntry(entry: TrackerEntry): Promise<void> {
    await this.local.write(trackerEntryToDto(entry));
  }

  async deleteEntry(trackerId: string, date: IsoDate): Promise<void> {
    await this.local.remove(trackerId, date);
  }

  async deleteAllForTracker(trackerId: string): Promise<void> {
    await this.local.removeTracker(trackerId);
  }
}
