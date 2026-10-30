import { sanitizeIdOrder } from '../../../core/utils/order';
import { TrackersOrderRepository } from '../repositories/TrackersOrderRepository';

/** Devuelve el orden manual guardado de la pantalla Trackers (ids), ya saneado. */
export class GetTrackersOrder {
  constructor(private readonly repository: TrackersOrderRepository) {}

  async execute(): Promise<string[]> {
    return sanitizeIdOrder(await this.repository.get());
  }
}
