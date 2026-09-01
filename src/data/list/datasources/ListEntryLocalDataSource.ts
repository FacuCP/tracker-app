import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { ListEntryDto } from '../dto/ListEntryDto';

/**
 * Fuente de datos local de las entradas. Blob JSON anidado:
 * { [listId]: { [entryId]: ListEntryDto } }.
 */
export interface ListEntryLocalDataSource {
  readAll(): Promise<Record<string, Record<string, ListEntryDto>>>;
  write(entry: ListEntryDto): Promise<void>;
  remove(listId: string, entryId: string): Promise<void>;
  removeList(listId: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.listEntries;

export class AsyncStorageListEntryLocalDataSource implements ListEntryLocalDataSource {
  async readAll(): Promise<Record<string, Record<string, ListEntryDto>>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, Record<string, ListEntryDto>>) ?? {};
    } catch {
      return {};
    }
  }

  private async persist(all: Record<string, Record<string, ListEntryDto>>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async write(entry: ListEntryDto): Promise<void> {
    const all = await this.readAll();
    const forList = all[entry.listId] ?? {};
    forList[entry.id] = entry;
    all[entry.listId] = forList;
    await this.persist(all);
  }

  async remove(listId: string, entryId: string): Promise<void> {
    const all = await this.readAll();
    if (all[listId]) {
      delete all[listId][entryId];
      await this.persist(all);
    }
  }

  async removeList(listId: string): Promise<void> {
    const all = await this.readAll();
    if (all[listId]) {
      delete all[listId];
      await this.persist(all);
    }
  }
}
