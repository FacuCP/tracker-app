import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { IsoDate } from '../../../core/utils/date';
import { MoodEntryDto } from '../dto/MoodEntryDto';

/**
 * Fuente de datos local del mood tracker. Define QUÉ operaciones existen;
 * la implementación de abajo decide CÓMO (acá, AsyncStorage con un único
 * blob JSON indexado por fecha).
 */
export interface MoodLocalDataSource {
  readAll(): Promise<Record<IsoDate, MoodEntryDto>>;
  write(entry: MoodEntryDto): Promise<void>;
  remove(date: IsoDate): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.moodEntries;

export class AsyncStorageMoodLocalDataSource implements MoodLocalDataSource {
  async readAll(): Promise<Record<IsoDate, MoodEntryDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw) as Record<IsoDate, MoodEntryDto>;
      return parsed ?? {};
    } catch {
      // Si el blob se corrompió, empezamos de cero en vez de romper la app.
      return {};
    }
  }

  async write(entry: MoodEntryDto): Promise<void> {
    const all = await this.readAll();
    all[entry.date as IsoDate] = entry;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(date: IsoDate): Promise<void> {
    const all = await this.readAll();
    delete all[date];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
