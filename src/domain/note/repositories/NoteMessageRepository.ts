import { NoteMessage } from '../entities/NoteMessage';

/** Puerto para los mensajes de las anotaciones del usuario. */
export interface NoteMessageRepository {
  getForNote(noteId: string): Promise<NoteMessage[]>;
  saveMessage(message: NoteMessage): Promise<void>;
  deleteMessage(noteId: string, messageId: string): Promise<void>;
  /** Borra todos los mensajes de una anotación (al eliminarla). */
  deleteAllForNote(noteId: string): Promise<void>;
}
