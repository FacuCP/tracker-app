import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { ListsOrderRepository } from '../../../domain/list/repositories/ListsOrderRepository';

const STORAGE_KEY = STORAGE_KEYS.listsOrder;

/** Guarda el orden de la pantalla Listas como un array JSON de ids. */
export class ListsOrderRepositoryImpl implements ListsOrderRepository {
  async get(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }

  async save(order: string[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }
}
