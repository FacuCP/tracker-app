import { CalendarEvent } from '../entities/CalendarEvent';
import { EventRepository } from '../repositories/EventRepository';

/** Todos los eventos, ordenados por fecha de la primera ocurrencia y horario. */
export class GetEvents {
  constructor(private readonly repository: EventRepository) {}

  async execute(): Promise<CalendarEvent[]> {
    const events = await this.repository.getAll();
    return events.sort(
      (a, b) => a.date.localeCompare(b.date) || (a.timeFrom ?? '').localeCompare(b.timeFrom ?? ''),
    );
  }
}
