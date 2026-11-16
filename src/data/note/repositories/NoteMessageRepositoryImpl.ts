import { NoteMessage } from '../../../domain/note/entities/NoteMessage';
import { NoteMessageRepository } from '../../../domain/note/repositories/NoteMessageRepository';
import { NoteMessageLocalDataSource } from '../datasources/NoteMessageLocalDataSource';
import { noteMessageFromDto, noteMessageToDto } from '../dto/NoteMessageDto';

export class NoteMessageRepositoryImpl implements NoteMessageRepository {
  constructor(private readonly local: NoteMessageLocalDataSource) {}

  async getForNote(noteId: string): Promise<NoteMessage[]> {
    const all = await this.local.readAll();
    const forNote = all[noteId] ?? {};
    return Object.values(forNote).map(noteMessageFromDto);
  }

  async saveMessage(message: NoteMessage): Promise<void> {
    await this.local.write(noteMessageToDto(message));
  }

  async deleteMessage(noteId: string, messageId: string): Promise<void> {
    await this.local.remove(noteId, messageId);
  }

  async deleteAllForNote(noteId: string): Promise<void> {
    await this.local.removeNote(noteId);
  }
}
