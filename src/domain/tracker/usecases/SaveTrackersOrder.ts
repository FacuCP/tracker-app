import { sanitizeIdOrder } from '../../../core/utils/order';
import { TrackersOrderRepository } from '../repositories/TrackersOrderRepository';

/** Guarda el orden manual de la pantalla Trackers (ids). */
export class SaveTrackersOrder {
  constructor(private readonly repository: TrackersOrderRepository) {}

  execute(order: string[]): Promise<void> {
    return this.repository.save(sanitizeIdOrder(order));
  }
}
