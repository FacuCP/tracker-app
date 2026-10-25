import { CalendarEvent } from '../../../domain/event/entities/CalendarEvent';

/** "09:00 - 10:30", "Desde 09:00", "Hasta 10:30", o "" si no tiene horario. */
export function eventTimeLabel(event: CalendarEvent): string {
  const { timeFrom, timeTo } = event;
  if (timeFrom && timeTo) return `${timeFrom} - ${timeTo}`;
  if (timeFrom) return `Desde ${timeFrom}`;
  if (timeTo) return `Hasta ${timeTo}`;
  return '';
}
