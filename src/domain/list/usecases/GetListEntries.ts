import { ListEntry, ListSort, compareListEntries } from '../entities/ListEntry';
import { ListEntryRepository } from '../repositories/ListEntryRepository';

/** Entradas de una lista, ya ordenadas según el criterio elegido. */
export class GetListEntries {
  constructor(private readonly repository: ListEntryRepository) {}

  async execute(listId: string, sort: ListSort = 'date'): Promise<ListEntry[]> {
    const entries = await this.repository.getForList(listId);
    return entries.sort((a, b) => compareListEntries(a, b, sort));
  }
}
