import { IsoDate, addDays, fromIsoDate, toIsoDate } from '../../../core/utils/date';
import { EventRepository } from '../repositories/EventRepository';

export type DeleteOccurrenceMode = 'only' | 'thisAndFollowing';

/**
 * Borra una ocurrencia puntual de un evento que se repite:
 *  - `only`: agrega esa fecha a `excludedDates`, el resto de la serie sigue.
 *  - `thisAndFollowing`: corta la repetición el día anterior a esa fecha (o,
 *    si es la primera ocurrencia, no queda nada: se borra el evento entero).
 */
export class DeleteEventOccurrence {
  constructor(private readonly repository: EventRepository) {}

  async execute(eventId: string, date: IsoDate, mode: DeleteOccurrenceMode): Promise<void> {
    const event = await this.repository.getById(eventId);
    if (!event) return;

    if (!event.repeat) {
      await this.repository.delete(eventId);
      return;
    }

    if (mode === 'only') {
      const excludedDates = [...(event.excludedDates ?? []), date];
      await this.repository.save({ ...event, excludedDates });
      return;
    }

    if (date <= event.date) {
      await this.repository.delete(eventId);
      return;
    }

    const endDate = toIsoDate(addDays(fromIsoDate(date), -1));
    await this.repository.save({
      ...event,
      repeat: { ...event.repeat, endType: 'onDate', endDate },
    });
  }
}
