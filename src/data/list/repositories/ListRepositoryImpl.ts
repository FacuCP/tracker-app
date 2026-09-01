import { List } from '../../../domain/list/entities/List';
import { ListRepository } from '../../../domain/list/repositories/ListRepository';
import { ListLocalDataSource } from '../datasources/ListLocalDataSource';
import { listFromDto, listToDto } from '../dto/ListDto';

export class ListRepositoryImpl implements ListRepository {
  constructor(private readonly local: ListLocalDataSource) {}

  async getAll(): Promise<List[]> {
    const all = await this.local.readAll();
    return Object.values(all).map(listFromDto);
  }

  async getById(id: string): Promise<List | null> {
    const all = await this.local.readAll();
    const dto = all[id];
    return dto ? listFromDto(dto) : null;
  }

  async save(list: List): Promise<void> {
    await this.local.write(listToDto(list));
  }

  async delete(id: string): Promise<void> {
    await this.local.remove(id);
  }
}
