import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { EventDto } from '../dto/EventDto';

/** Fuente de datos local de los eventos (un blob JSON indexado por id). */
export interface EventLocalDataSource {
  readAll(): Promise<Record<string, EventDto>>;
  write(event: EventDto): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.events;

export class AsyncStorageEventLocalDataSource implements EventLocalDataSource {
  async readAll(): Promise<Record<string, EventDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, EventDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(event: EventDto): Promise<void> {
    const all = await this.readAll();
    all[event.id] = event;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    delete all[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
