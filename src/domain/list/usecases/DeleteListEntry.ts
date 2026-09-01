import { ListEntryRepository } from '../repositories/ListEntryRepository';

/** Borra una entrada de una lista. */
export class DeleteListEntry {
  constructor(private readonly repository: ListEntryRepository) {}

  execute(listId: string, entryId: string): Promise<void> {
    return this.repository.deleteEntry(listId, entryId);
  }
}
