import { sanitizeIdOrder } from '../../../core/utils/order';
import { ListsOrderRepository } from '../repositories/ListsOrderRepository';

/** Devuelve el orden manual guardado de la pantalla Listas (ids), ya saneado. */
export class GetListsOrder {
  constructor(private readonly repository: ListsOrderRepository) {}

  async execute(): Promise<string[]> {
    return sanitizeIdOrder(await this.repository.get());
  }
}
