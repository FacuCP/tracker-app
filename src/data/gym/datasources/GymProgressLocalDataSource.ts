import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { GymProgressDto } from '../dto/GymProgressDto';

/**
 * Fuente de datos local del progreso. Blob JSON anidado:
 * { [routineId]: { [exerciseId]: GymProgressDto } }.
 */
export interface GymProgressLocalDataSource {
  readAll(): Promise<Record<string, Record<string, GymProgressDto>>>;
  write(progress: GymProgressDto): Promise<void>;
  remove(routineId: string, exerciseId: string): Promise<void>;
  removeRoutine(routineId: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.gymProgress;

export class AsyncStorageGymProgressLocalDataSource implements GymProgressLocalDataSource {
  async readAll(): Promise<Record<string, Record<string, GymProgressDto>>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, Record<string, GymProgressDto>>) ?? {};
    } catch {
      return {};
    }
  }

  private async persist(all: Record<string, Record<string, GymProgressDto>>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async write(progress: GymProgressDto): Promise<void> {
    const all = await this.readAll();
    const forRoutine = all[progress.routineId] ?? {};
    forRoutine[progress.exerciseId] = progress;
    all[progress.routineId] = forRoutine;
    await this.persist(all);
  }

  async remove(routineId: string, exerciseId: string): Promise<void> {
    const all = await this.readAll();
    if (all[routineId]) {
      delete all[routineId][exerciseId];
      await this.persist(all);
    }
  }

  async removeRoutine(routineId: string): Promise<void> {
    const all = await this.readAll();
    if (all[routineId]) {
      delete all[routineId];
      await this.persist(all);
    }
  }
}
