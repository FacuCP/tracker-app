import { createNoteMessage } from '../entities/NoteMessage';
import { NoteMessageRepository } from '../repositories/NoteMessageRepository';

/**
 * Cambia a qué anotaciones pertenece un mensaje (agregarlo a otra, sacarlo
 * de la actual) sin tocar nada más de él — texto, medios, fecha de envío,
 * a qué responde y si se editó quedan exactamente iguales. `noteIds` no
 * puede quedar vacío (`createNoteMessage` lo valida): un mensaje sin
 * ninguna anotación no tiene sentido, se borra en vez de eso
 * (`DeleteNoteMessage`) — quien llama a esto decide antes si alguno de los
 * mensajes quedaría así y, si es el caso, no lo incluye.
 */
export class SetNoteMessageNotes {
  constructor(private readonly repository: NoteMessageRepository) {}

  async execute(messageId: string, noteIds: string[]): Promise<void> {
    const message = await this.repository.getById(messageId);
    if (!message) {
      throw new Error('El mensaje no existe');
    }
    const updated = createNoteMessage({
      id: message.id,
      noteIds,
      kind: message.kind,
      text: message.text,
      media: message.media,
      mediaItems: message.mediaItems,
      favorite: message.favorite,
      sentAt: message.sentAt,
      replyToId: message.replyToId,
      editedAt: message.editedAt,
    });
    await this.repository.saveMessage(updated);
  }
}
