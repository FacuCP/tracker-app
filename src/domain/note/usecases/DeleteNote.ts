import { NoteMessageRepository } from '../repositories/NoteMessageRepository';
import { NoteRepository } from '../repositories/NoteRepository';

/** Borra una anotación y todos sus mensajes. */
export class DeleteNote {
  constructor(
    private readonly notes: NoteRepository,
    private readonly messages: NoteMessageRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.messages.deleteAllForNote(id);
    await this.notes.delete(id);
  }
}
