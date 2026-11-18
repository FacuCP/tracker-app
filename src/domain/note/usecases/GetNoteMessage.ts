import { NoteMessage } from '../entities/NoteMessage';
import { NoteMessageRepository } from '../repositories/NoteMessageRepository';

/**
 * Un mensaje por id, sin importar a qué anotación(es) pertenece. Lo usan
 * las vistas de chat para resolver la cita de un mensaje al que se
 * respondió cuando ya no está entre los mensajes de la anotación que se
 * está viendo (se lo sacó de ahí, pero sigue existiendo en otra) — así no
 * se lo muestra como "Mensaje eliminado" sin estarlo.
 */
export class GetNoteMessage {
  constructor(private readonly repository: NoteMessageRepository) {}

  execute(messageId: string): Promise<NoteMessage | null> {
    return this.repository.getById(messageId);
  }
}
