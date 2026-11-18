import { NoteMessageRepository } from '../repositories/NoteMessageRepository';
import { NoteRepository } from '../repositories/NoteRepository';

/**
 * Borra una anotación. A sus mensajes los desvincula de ella (si pertenecen
 * a alguna otra, siguen existiendo ahí) — solo se borran del todo los que no
 * quedaban en ninguna otra anotación. Ver `NoteMessageRepository.detachFromNote`.
 */
export class DeleteNote {
  constructor(
    private readonly notes: NoteRepository,
    private readonly messages: NoteMessageRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.messages.detachFromNote(id);
    await this.notes.delete(id);
  }
}
