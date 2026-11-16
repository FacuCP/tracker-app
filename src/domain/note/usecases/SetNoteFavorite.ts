import { NoteRepository } from '../repositories/NoteRepository';

/** Marca o desmarca una anotación como favorita. */
export class SetNoteFavorite {
  constructor(private readonly repository: NoteRepository) {}

  async execute(id: string, favorite: boolean): Promise<void> {
    const note = await this.repository.getById(id);
    if (!note) {
      throw new Error('La anotación no existe');
    }
    await this.repository.save({ ...note, favorite });
  }
}
