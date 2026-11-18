import { createNoteMessage } from '../entities/NoteMessage';
import { NoteMessageRepository } from '../repositories/NoteMessageRepository';

/**
 * Marca/desmarca un mensaje como favorito (estrella). Es del mensaje, no de
 * una anotación: si pertenece a varias, es favorito en todas. No toca nada
 * más de él.
 */
export class SetNoteMessageFavorite {
  constructor(private readonly repository: NoteMessageRepository) {}

  async execute(messageId: string, favorite: boolean): Promise<void> {
    const message = await this.repository.getById(messageId);
    if (!message) {
      throw new Error('El mensaje no existe');
    }
    await this.repository.saveMessage(createNoteMessage({ ...message, favorite }));
  }
}
