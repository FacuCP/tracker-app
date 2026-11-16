import { todayIso } from '../../../core/utils/date';
import { Note, createNote } from '../entities/Note';
import { NoteRepository } from '../repositories/NoteRepository';

/** Crea una anotación nueva (solo un nombre). */
export class CreateNote {
  constructor(
    private readonly repository: NoteRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(name: string, favorite = false): Promise<Note> {
    const note = createNote({
      id: this.generateId(),
      name,
      createdAt: todayIso(),
      favorite,
    });
    await this.repository.save(note);
    return note;
  }
}
