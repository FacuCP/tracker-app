import { ListRepository } from '../repositories/ListRepository';

/** Marca o desmarca una lista como favorita. */
export class SetListFavorite {
  constructor(private readonly repository: ListRepository) {}

  async execute(id: string, favorite: boolean): Promise<void> {
    const list = await this.repository.getById(id);
    if (!list) {
      throw new Error('La lista no existe');
    }
    await this.repository.save({ ...list, favorite });
  }
}
