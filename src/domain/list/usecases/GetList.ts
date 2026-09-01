import { List } from '../entities/List';
import { ListRepository } from '../repositories/ListRepository';

/** Devuelve una lista por id, o null si no existe. */
export class GetList {
  constructor(private readonly repository: ListRepository) {}

  execute(id: string): Promise<List | null> {
    return this.repository.getById(id);
  }
}
