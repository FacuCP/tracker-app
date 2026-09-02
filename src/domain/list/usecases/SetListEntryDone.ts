import { ListEntryRepository } from '../repositories/ListEntryRepository';

/** Marca o desmarca una entrada de una to-do list como completada. */
export class SetListEntryDone {
  constructor(private readonly entries: ListEntryRepository) {}

  async execute(listId: string, entryId: string, done: boolean): Promise<void> {
    const all = await this.entries.getForList(listId);
    const entry = all.find((e) => e.id === entryId);
    if (!entry) {
      throw new Error('La entrada no existe');
    }
    await this.entries.saveEntry({ ...entry, done });
  }
}
