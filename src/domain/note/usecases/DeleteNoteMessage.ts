import { NoteMessageRepository } from '../repositories/NoteMessageRepository';

/**
 * Borra un mensaje del todo — de todas las anotaciones a las que pertenece,
 * no solo de la que se está viendo. Para sacarlo de una sola anotación sin
 * borrarlo, ver `SetNoteMessageNotes`.
 */
export class DeleteNoteMessage {
  constructor(private readonly repository: NoteMessageRepository) {}

  execute(messageId: string): Promise<void> {
    return this.repository.deleteMessage(messageId);
  }
}
