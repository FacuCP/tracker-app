import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { GymRoutineDto } from '../dto/GymRoutineDto';

/** Fuente de datos local de las rutinas (un blob JSON indexado por id). */
export interface GymRoutineLocalDataSource {
  readAll(): Promise<Record<string, GymRoutineDto>>;
  write(routine: GymRoutineDto): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.gymRoutines;

export class AsyncStorageGymRoutineLocalDataSource implements GymRoutineLocalDataSource {
  async readAll(): Promise<Record<string, GymRoutineDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, GymRoutineDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(routine: GymRoutineDto): Promise<void> {
    const all = await this.readAll();
    all[routine.id] = routine;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    delete all[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
