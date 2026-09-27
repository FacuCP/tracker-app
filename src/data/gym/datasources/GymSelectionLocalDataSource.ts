import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';

/** Fuente de datos local de la rutina elegida para hoy: `{ routineId }`. */
export interface GymSelectionLocalDataSource {
  read(): Promise<string | null>;
  write(routineId: string | null): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.gymSelection;

export class AsyncStorageGymSelectionLocalDataSource implements GymSelectionLocalDataSource {
  async read(): Promise<string | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { routineId?: string | null };
      return parsed.routineId ?? null;
    } catch {
      return null;
    }
  }

  async write(routineId: string | null): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ routineId }));
  }
}
