import { Note } from '../../../domain/note/entities/Note';
import { NoteRepository } from '../../../domain/note/repositories/NoteRepository';
import { NoteLocalDataSource } from '../datasources/NoteLocalDataSource';
import { noteFromDto, noteToDto } from '../dto/NoteDto';

export class NoteRepositoryImpl implements NoteRepository {
  constructor(private readonly local: NoteLocalDataSource) {}

  async getAll(): Promise<Note[]> {
    const all = await this.local.readAll();
    return Object.values(all).map(noteFromDto);
  }

  async getById(id: string): Promise<Note | null> {
    const all = await this.local.readAll();
    const dto = all[id];
    return dto ? noteFromDto(dto) : null;
  }

  async save(note: Note): Promise<void> {
    await this.local.write(noteToDto(note));
  }

  async delete(id: string): Promise<void> {
    await this.local.remove(id);
  }
}
