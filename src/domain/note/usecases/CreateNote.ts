import { todayIso } from '../../../core/utils/date';
import { Note, createNote } from '../entities/Note';
import { NoteRepository } from '../repositories/NoteRepository';

/** Crea una anotación nueva (nombre y, opcionalmente, una descripción corta). */
export class CreateNote {
  constructor(
    private readonly repository: NoteRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(name: string, favorite = false, description?: string): Promise<Note> {
    const note = createNote({
      id: this.generateId(),
      name,
      description,
      createdAt: todayIso(),
      favorite,
    });
    await this.repository.save(note);
    return note;
  }
}
