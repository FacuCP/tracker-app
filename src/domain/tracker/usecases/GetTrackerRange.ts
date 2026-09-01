import { IsoDate } from '../../../core/utils/date';
import { TrackerEntry } from '../entities/TrackerEntry';
import { TrackerEntryRepository } from '../repositories/TrackerEntryRepository';

export interface TrackerNumberStats {
  count: number;
  sum: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

export interface TrackerRangeResult {
  readonly start: IsoDate;
  readonly end: IsoDate;
  readonly entriesByDate: Record<IsoDate, TrackerEntry>;
  /** Para trackers de opciones: cuántas veces se eligió cada opción (por id). */
  readonly optionCounts: Record<string, number>;
  /** Para trackers de número: resumen de los valores del rango. */
  readonly numberStats: TrackerNumberStats;
}

/**
 * Trae los registros de un rango y calcula las estadísticas que muestra la
 * pantalla de progreso (conteo por opción, o promedio/mín/máx del número).
 */
export class GetTrackerRange {
  constructor(private readonly entries: TrackerEntryRepository) {}

  async execute(trackerId: string, start: IsoDate, end: IsoDate): Promise<TrackerRangeResult> {
    const list = await this.entries.getEntriesInRange(trackerId, start, end);

    const entriesByDate: Record<IsoDate, TrackerEntry> = {};
    const optionCounts: Record<string, number> = {};
    let count = 0;
    let sum = 0;
    let min: number | null = null;
    let max: number | null = null;

    for (const entry of list) {
      entriesByDate[entry.date] = entry;

      if (entry.optionId != null) {
        optionCounts[entry.optionId] = (optionCounts[entry.optionId] ?? 0) + 1;
      }
      if (entry.value != null) {
        count += 1;
        sum += entry.value;
        min = min == null ? entry.value : Math.min(min, entry.value);
        max = max == null ? entry.value : Math.max(max, entry.value);
      }
    }

    const average = count > 0 ? Math.round((sum / count) * 100) / 100 : null;

    return {
      start,
      end,
      entriesByDate,
      optionCounts,
      numberStats: { count, sum: Math.round(sum * 100) / 100, average, min, max },
    };
  }
}
