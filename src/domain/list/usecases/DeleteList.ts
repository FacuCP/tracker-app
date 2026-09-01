import { ListEntryRepository } from '../repositories/ListEntryRepository';
import { ListRepository } from '../repositories/ListRepository';

/** Borra una lista y todas sus entradas. */
export class DeleteList {
  constructor(
    private readonly lists: ListRepository,
    private readonly entries: ListEntryRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.entries.deleteAllForList(id);
    await this.lists.delete(id);
  }
}
