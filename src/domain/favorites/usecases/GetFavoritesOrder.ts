import { sanitizeFavoritesOrder } from '../entities/FavoriteRef';
import { FavoritesOrderRepository } from '../repositories/FavoritesOrderRepository';

/** Devuelve el orden manual guardado (claves), ya saneado. */
export class GetFavoritesOrder {
  constructor(private readonly repository: FavoritesOrderRepository) {}

  async execute(): Promise<string[]> {
    return sanitizeFavoritesOrder(await this.repository.get());
  }
}
