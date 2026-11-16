import { Note } from '../entities/Note';
import { NoteRepository } from '../repositories/NoteRepository';

/** Lista las anotaciones del usuario, de la más vieja a la más nueva. */
export class GetNotes {
  constructor(private readonly repository: NoteRepository) {}

  async execute(): Promise<Note[]> {
    const notes = await this.repository.getAll();
    return notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
