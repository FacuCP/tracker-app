import { NoteMessageRepository } from '../repositories/NoteMessageRepository';

/** Borra un mensaje de una anotación. */
export class DeleteNoteMessage {
  constructor(private readonly repository: NoteMessageRepository) {}

  execute(noteId: string, messageId: string): Promise<void> {
    return this.repository.deleteMessage(noteId, messageId);
  }
}
