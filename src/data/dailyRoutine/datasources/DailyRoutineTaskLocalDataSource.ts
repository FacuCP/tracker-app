import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { DailyRoutineTaskDto } from '../dto/DailyRoutineTaskDto';

/** Fuente de datos local de las tareas de rutina diaria (un blob JSON indexado por id). */
export interface DailyRoutineTaskLocalDataSource {
  readAll(): Promise<Record<string, DailyRoutineTaskDto>>;
  write(task: DailyRoutineTaskDto): Promise<void>;
  writeMany(tasks: DailyRoutineTaskDto[]): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.dailyRoutineTasks;

export class AsyncStorageDailyRoutineTaskLocalDataSource implements DailyRoutineTaskLocalDataSource {
  async readAll(): Promise<Record<string, DailyRoutineTaskDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, DailyRoutineTaskDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(task: DailyRoutineTaskDto): Promise<void> {
    const all = await this.readAll();
    all[task.id] = task;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async writeMany(tasks: DailyRoutineTaskDto[]): Promise<void> {
    if (tasks.length === 0) return;
    const all = await this.readAll();
    for (const task of tasks) {
      all[task.id] = task;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    delete all[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
