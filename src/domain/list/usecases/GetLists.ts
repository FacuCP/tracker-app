import { List } from '../entities/List';
import { ListRepository } from '../repositories/ListRepository';

/** Lista las listas del usuario, del más viejo al más nuevo. */
export class GetLists {
  constructor(private readonly repository: ListRepository) {}

  async execute(): Promise<List[]> {
    const lists = await this.repository.getAll();
    return lists.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
