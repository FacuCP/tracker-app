import { IsoDate } from '../../../core/utils/date';
import { CalendarEvent } from '../entities/CalendarEvent';
import { eventOccurrencesInRange } from '../entities/occurrences';
import { EventRepository } from '../repositories/EventRepository';

export interface DayEventOccurrence {
  readonly event: CalendarEvent;
  readonly date: IsoDate;
}

/**
 * Arma, para cada día del rango que tenga al menos un evento, la lista de
 * ocurrencias de ese día (ordenadas por horario) — lo que necesita tanto el
 * calendario (franjas por día) como el modal de "eventos de este día".
 */
export class GetEventOccurrencesInRange {
  constructor(private readonly repository: EventRepository) {}

  async execute(startIso: IsoDate, endIso: IsoDate): Promise<Record<IsoDate, DayEventOccurrence[]>> {
    const events = await this.repository.getAll();
    const byDate: Record<IsoDate, DayEventOccurrence[]> = {};

    for (const event of events) {
      for (const occurrence of eventOccurrencesInRange(event, startIso, endIso)) {
        (byDate[occurrence.date] ??= []).push({ event, date: occurrence.date });
      }
    }
    for (const date of Object.keys(byDate)) {
      // Sin horario primero (como "todo el día"), después por horario de inicio.
      byDate[date].sort((a, b) => (a.event.timeFrom ?? '').localeCompare(b.event.timeFrom ?? ''));
    }
    return byDate;
  }
}
