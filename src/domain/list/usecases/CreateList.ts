import { todayIso } from '../../../core/utils/date';
import { List, createList } from '../entities/List';
import { ListRepository } from '../repositories/ListRepository';

/** Crea una lista nueva (solo un nombre). */
export class CreateList {
  constructor(
    private readonly repository: ListRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(name: string, isTodo = false, favorite = false): Promise<List> {
    const list = createList({
      id: this.generateId(),
      name,
      createdAt: todayIso(),
      isTodo,
      favorite,
    });
    await this.repository.save(list);
    return list;
  }
}
