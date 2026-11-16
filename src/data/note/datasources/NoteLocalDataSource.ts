import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { NoteDto } from '../dto/NoteDto';

/** Fuente de datos local de las anotaciones (un blob JSON indexado por id). */
export interface NoteLocalDataSource {
  readAll(): Promise<Record<string, NoteDto>>;
  write(note: NoteDto): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.notes;

export class AsyncStorageNoteLocalDataSource implements NoteLocalDataSource {
  async readAll(): Promise<Record<string, NoteDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, NoteDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(note: NoteDto): Promise<void> {
    const all = await this.readAll();
    all[note.id] = note;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    delete all[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
