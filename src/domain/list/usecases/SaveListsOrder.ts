import { sanitizeIdOrder } from '../../../core/utils/order';
import { ListsOrderRepository } from '../repositories/ListsOrderRepository';

/** Guarda el orden manual de la pantalla Listas (ids). */
export class SaveListsOrder {
  constructor(private readonly repository: ListsOrderRepository) {}

  execute(order: string[]): Promise<void> {
    return this.repository.save(sanitizeIdOrder(order));
  }
}
