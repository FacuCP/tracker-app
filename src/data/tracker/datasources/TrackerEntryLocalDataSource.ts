import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { IsoDate } from '../../../core/utils/date';
import { TrackerEntryDto } from '../dto/TrackerEntryDto';

/**
 * Fuente de datos local de los registros de trackers. Blob JSON anidado:
 * { [trackerId]: { [fecha]: TrackerEntryDto } }.
 */
export interface TrackerEntryLocalDataSource {
  readAll(): Promise<Record<string, Record<IsoDate, TrackerEntryDto>>>;
  write(entry: TrackerEntryDto): Promise<void>;
  remove(trackerId: string, date: IsoDate): Promise<void>;
  removeTracker(trackerId: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.trackerEntries;

export class AsyncStorageTrackerEntryLocalDataSource implements TrackerEntryLocalDataSource {
  async readAll(): Promise<Record<string, Record<IsoDate, TrackerEntryDto>>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, Record<IsoDate, TrackerEntryDto>>) ?? {};
    } catch {
      return {};
    }
  }

  private async persist(all: Record<string, Record<IsoDate, TrackerEntryDto>>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async write(entry: TrackerEntryDto): Promise<void> {
    const all = await this.readAll();
    const forTracker = all[entry.trackerId] ?? {};
    forTracker[entry.date as IsoDate] = entry;
    all[entry.trackerId] = forTracker;
    await this.persist(all);
  }

  async remove(trackerId: string, date: IsoDate): Promise<void> {
    const all = await this.readAll();
    if (all[trackerId]) {
      delete all[trackerId][date];
      await this.persist(all);
    }
  }

  async removeTracker(trackerId: string): Promise<void> {
    const all = await this.readAll();
    if (all[trackerId]) {
      delete all[trackerId];
      await this.persist(all);
    }
  }
}
