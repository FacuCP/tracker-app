import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../core/storage/keys';
import { FavoritesOrderRepository } from '../../domain/favorites/repositories/FavoritesOrderRepository';

const STORAGE_KEY = STORAGE_KEYS.favoritesOrder;

/** Guarda el orden de Favoritos como un array JSON de claves. */
export class FavoritesOrderRepositoryImpl implements FavoritesOrderRepository {
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
