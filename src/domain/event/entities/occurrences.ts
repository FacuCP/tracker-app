import { IsoDate, addDays, addMonthsClamped, fromIsoDate, toIsoDate } from '../../../core/utils/date';
import { CalendarEvent } from './CalendarEvent';

export interface EventOccurrence {
  readonly date: IsoDate;
  /** Número de ocurrencia, 0 = la primera. */
  readonly index: number;
}

const MAX_OCCURRENCES = 5000;

/**
 * Ocurrencias de un evento dentro del rango `[startIso, endIso]` (ambos
 * inclusive). Un evento sin repetición tiene a lo sumo una ocurrencia (su
 * propia fecha); uno indefinido se corta en `endIso` o en `MAX_OCCURRENCES`,
 * lo que llegue primero — igual que `financeOccurrencesInRange`.
 */
export function eventOccurrencesInRange(
  event: CalendarEvent,
  startIso: IsoDate,
  endIso: IsoDate,
): EventOccurrence[] {
  const repeat = event.repeat;
  const effectiveEnd =
    repeat?.endType === 'onDate' && repeat.endDate && repeat.endDate < endIso ? repeat.endDate : endIso;
  if (effectiveEnd < event.date) return [];

  const base = fromIsoDate(event.date);
  const intervalValue = repeat?.intervalValue ?? 1;
  const limit = !repeat ? 1 : repeat.endType === 'afterCount' ? repeat.count ?? 1 : MAX_OCCURRENCES;
  const excluded = event.excludedDates;

  const out: EventOccurrence[] = [];
  for (let i = 0; i < limit && i < MAX_OCCURRENCES; i += 1) {
    const stepDate =
      repeat?.intervalUnit === 'months'
        ? addMonthsClamped(base, i * intervalValue)
        : addDays(base, i * intervalValue);
    const iso = toIsoDate(stepDate);
    if (iso > effectiveEnd) break;
    if (iso >= startIso && !excluded?.includes(iso)) {
      out.push({ date: iso, index: i });
    }
  }
  return out;
}
