import { ListRepository } from '../repositories/ListRepository';

/** Fija si una lista queda desplegada por defecto (en Favoritos/Listas) en vez de colapsada. */
export class SetListPinnedExpanded {
  constructor(private readonly repository: ListRepository) {}

  async execute(id: string, pinnedExpanded: boolean): Promise<void> {
    const list = await this.repository.getById(id);
    if (!list) {
      throw new Error('La lista no existe');
    }
    await this.repository.save({ ...list, pinnedExpanded });
  }
}
