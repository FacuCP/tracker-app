import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { NoteMessageDto } from '../dto/NoteMessageDto';

/**
 * Fuente de datos local de los mensajes. Blob JSON anidado:
 * { [noteId]: { [messageId]: NoteMessageDto } }.
 */
export interface NoteMessageLocalDataSource {
  readAll(): Promise<Record<string, Record<string, NoteMessageDto>>>;
  write(message: NoteMessageDto): Promise<void>;
  remove(noteId: string, messageId: string): Promise<void>;
  removeNote(noteId: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.noteMessages;

export class AsyncStorageNoteMessageLocalDataSource implements NoteMessageLocalDataSource {
  async readAll(): Promise<Record<string, Record<string, NoteMessageDto>>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, Record<string, NoteMessageDto>>) ?? {};
    } catch {
      return {};
    }
  }

  private async persist(all: Record<string, Record<string, NoteMessageDto>>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async write(message: NoteMessageDto): Promise<void> {
    const all = await this.readAll();
    const forNote = all[message.noteId] ?? {};
    forNote[message.id] = message;
    all[message.noteId] = forNote;
    await this.persist(all);
  }

  async remove(noteId: string, messageId: string): Promise<void> {
    const all = await this.readAll();
    if (all[noteId]) {
      delete all[noteId][messageId];
      await this.persist(all);
    }
  }

  async removeNote(noteId: string): Promise<void> {
    const all = await this.readAll();
    if (all[noteId]) {
      delete all[noteId];
      await this.persist(all);
    }
  }
}
