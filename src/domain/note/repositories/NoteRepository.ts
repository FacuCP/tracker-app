import { Note } from '../entities/Note';

/** Puerto para el CRUD de las anotaciones del usuario. */
export interface NoteRepository {
  getAll(): Promise<Note[]>;
  getById(id: string): Promise<Note | null>;
  save(note: Note): Promise<void>;
  delete(id: string): Promise<void>;
}
