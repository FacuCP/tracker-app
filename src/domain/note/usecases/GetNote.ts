import { Note } from '../entities/Note';
import { NoteRepository } from '../repositories/NoteRepository';

/** Devuelve una anotación por id, o null si no existe. */
export class GetNote {
  constructor(private readonly repository: NoteRepository) {}

  execute(id: string): Promise<Note | null> {
    return this.repository.getById(id);
  }
}
