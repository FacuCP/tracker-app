import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { DailyTaskProgressDto } from '../dto/DailyTaskProgressDto';

/**
 * Fuente de datos local del progreso de las tareas de rutina diaria: un blob
 * JSON indexado por `taskId` (una sola fila por tarea, se pisa cada día).
 */
export interface DailyTaskProgressLocalDataSource {
  readAll(): Promise<Record<string, DailyTaskProgressDto>>;
  write(progress: DailyTaskProgressDto): Promise<void>;
  remove(taskId: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.dailyTaskProgress;

export class AsyncStorageDailyTaskProgressLocalDataSource implements DailyTaskProgressLocalDataSource {
  async readAll(): Promise<Record<string, DailyTaskProgressDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, DailyTaskProgressDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(progress: DailyTaskProgressDto): Promise<void> {
    const all = await this.readAll();
    all[progress.taskId] = progress;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(taskId: string): Promise<void> {
    const all = await this.readAll();
    delete all[taskId];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
