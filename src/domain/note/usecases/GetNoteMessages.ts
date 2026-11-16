import { NoteMessage } from '../entities/NoteMessage';
import { NoteMessageRepository } from '../repositories/NoteMessageRepository';

/** Mensajes de una anotación, del más viejo al más nuevo (orden de chat). */
export class GetNoteMessages {
  constructor(private readonly repository: NoteMessageRepository) {}

  async execute(noteId: string): Promise<NoteMessage[]> {
    const messages = await this.repository.getForNote(noteId);
    return messages.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  }
}
