import { ListEntry } from '../../../domain/list/entities/ListEntry';
import { ListEntryRepository } from '../../../domain/list/repositories/ListEntryRepository';
import { ListEntryLocalDataSource } from '../datasources/ListEntryLocalDataSource';
import { listEntryFromDto, listEntryToDto } from '../dto/ListEntryDto';

export class ListEntryRepositoryImpl implements ListEntryRepository {
  constructor(private readonly local: ListEntryLocalDataSource) {}

  async getForList(listId: string): Promise<ListEntry[]> {
    const all = await this.local.readAll();
    const forList = all[listId] ?? {};
    return Object.values(forList).map(listEntryFromDto);
  }

  async saveEntry(entry: ListEntry): Promise<void> {
    await this.local.write(listEntryToDto(entry));
  }

  async deleteEntry(listId: string, entryId: string): Promise<void> {
    await this.local.remove(listId, entryId);
  }

  async deleteAllForList(listId: string): Promise<void> {
    await this.local.removeList(listId);
  }
}
