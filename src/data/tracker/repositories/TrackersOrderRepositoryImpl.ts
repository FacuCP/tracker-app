import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { TrackersOrderRepository } from '../../../domain/tracker/repositories/TrackersOrderRepository';

const STORAGE_KEY = STORAGE_KEYS.trackersOrder;

/** Guarda el orden de la pantalla Trackers como un array JSON de ids. */
export class TrackersOrderRepositoryImpl implements TrackersOrderRepository {
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
