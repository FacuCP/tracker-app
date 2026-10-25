import { CalendarEvent } from '../entities/CalendarEvent';

/** Puerto para los eventos del calendario. */
export interface EventRepository {
  getAll(): Promise<CalendarEvent[]>;
  getById(id: string): Promise<CalendarEvent | null>;
  save(event: CalendarEvent): Promise<void>;
  delete(id: string): Promise<void>;
}
