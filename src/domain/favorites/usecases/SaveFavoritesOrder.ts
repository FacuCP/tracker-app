import { sanitizeFavoritesOrder } from '../entities/FavoriteRef';
import { FavoritesOrderRepository } from '../repositories/FavoritesOrderRepository';

/** Guarda el orden manual de Favoritos (claves). */
export class SaveFavoritesOrder {
  constructor(private readonly repository: FavoritesOrderRepository) {}

  execute(order: string[]): Promise<void> {
    return this.repository.save(sanitizeFavoritesOrder(order));
  }
}
