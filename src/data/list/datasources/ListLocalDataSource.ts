import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { ListDto } from '../dto/ListDto';

/** Fuente de datos local de las listas (un blob JSON indexado por id). */
export interface ListLocalDataSource {
  readAll(): Promise<Record<string, ListDto>>;
  write(list: ListDto): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.lists;

export class AsyncStorageListLocalDataSource implements ListLocalDataSource {
  async readAll(): Promise<Record<string, ListDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, ListDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(list: ListDto): Promise<void> {
    const all = await this.readAll();
    all[list.id] = list;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    delete all[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
