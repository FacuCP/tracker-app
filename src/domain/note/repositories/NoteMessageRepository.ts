import { NoteMessage } from '../entities/NoteMessage';

/** Puerto para los mensajes de las anotaciones del usuario. */
export interface NoteMessageRepository {
  getForNote(noteId: string): Promise<NoteMessage[]>;
  getById(messageId: string): Promise<NoteMessage | null>;
  saveMessage(message: NoteMessage): Promise<void>;
  /** Borra el mensaje de todas las anotaciones a las que pertenece (y su archivo, si tiene). */
  deleteMessage(messageId: string): Promise<void>;
  /**
   * Saca una anotación de todos los mensajes que la tengan (al eliminarla).
   * Si para algún mensaje esa era la única anotación a la que pertenecía, lo
   * borra directo (mismo efecto que `deleteMessage`, archivo incluido) en
   * vez de dejarlo con `noteIds: []`.
   */
  detachFromNote(noteId: string): Promise<void>;
}
