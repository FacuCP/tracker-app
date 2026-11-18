import { NoteMessage } from '../../../domain/note/entities/NoteMessage';
import { NoteMessageRepository } from '../../../domain/note/repositories/NoteMessageRepository';
import { NoteMessageLocalDataSource } from '../datasources/NoteMessageLocalDataSource';
import { NoteMessageDto, noteMessageFromDto, noteMessageToDto } from '../dto/NoteMessageDto';
import { deleteNoteMedia } from '../noteMediaStorage';

/** Limpia el/los archivo(s) de un mensaje de medios que se borró del todo — no hace nada para uno de texto. */
function cleanUpMedia(dto: NoteMessageDto | null): void {
  if (!dto) return;
  if (dto.media) deleteNoteMedia(dto.media.fileName);
  dto.mediaItems?.forEach((item) => deleteNoteMedia(item.fileName));
}

export class NoteMessageRepositoryImpl implements NoteMessageRepository {
  constructor(private readonly local: NoteMessageLocalDataSource) {}

  async getForNote(noteId: string): Promise<NoteMessage[]> {
    const all = await this.local.readAll();
    return Object.values(all)
      .filter((dto) => dto.noteIds.includes(noteId))
      .map(noteMessageFromDto);
  }

  async getById(messageId: string): Promise<NoteMessage | null> {
    const all = await this.local.readAll();
    const dto = all[messageId];
    return dto ? noteMessageFromDto(dto) : null;
  }

  async saveMessage(message: NoteMessage): Promise<void> {
    await this.local.write(noteMessageToDto(message));
  }

  async deleteMessage(messageId: string): Promise<void> {
    const removed = await this.local.remove(messageId);
    cleanUpMedia(removed);
  }

  async detachFromNote(noteId: string): Promise<void> {
    const removed = await this.local.detachFromNote(noteId);
    removed.forEach(cleanUpMedia);
  }
}
