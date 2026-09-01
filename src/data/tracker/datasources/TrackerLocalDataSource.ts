import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { TrackerDto } from '../dto/TrackerDto';

/**
 * Fuente de datos local de los trackers. Guarda un único blob JSON indexado
 * por id de tracker, igual criterio que el mood tracker.
 */
export interface TrackerLocalDataSource {
  readAll(): Promise<Record<string, TrackerDto>>;
  write(tracker: TrackerDto): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.trackers;

export class AsyncStorageTrackerLocalDataSource implements TrackerLocalDataSource {
  async readAll(): Promise<Record<string, TrackerDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, TrackerDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(tracker: TrackerDto): Promise<void> {
    const all = await this.readAll();
    all[tracker.id] = tracker;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    delete all[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
