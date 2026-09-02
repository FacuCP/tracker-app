import { List } from '../entities/List';
import { ListRepository } from '../repositories/ListRepository';

/**
 * Lista las listas del usuario: primero las to-do lists, y dentro de cada
 * grupo del más viejo al más nuevo.
 */
export class GetLists {
  constructor(private readonly repository: ListRepository) {}

  async execute(): Promise<List[]> {
    const lists = await this.repository.getAll();
    return lists.sort((a, b) => {
      if (a.isTodo !== b.isTodo) return a.isTodo ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }
}
