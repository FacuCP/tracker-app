import { IsoDate } from '../../../core/utils/date';
import { MoodColorCounts, emptyMoodColorCounts } from '../entities/MoodColor';
import { MoodEntry } from '../entities/MoodEntry';
import { MoodRepository } from '../repositories/MoodRepository';

export interface MoodRangeResult {
  readonly start: IsoDate;
  readonly end: IsoDate;
  /** Registros del rango indexados por fecha ISO */
  readonly entriesByDate: Record<IsoDate, MoodEntry>;
  /** Cuántas veces aparece cada color en el rango (contando los dos por día) */
  readonly colorCounts: MoodColorCounts;
  /** Promedio de las notas del rango (redondeado a un decimal), o null si no hay */
  readonly noteAverage: number | null;
  /** Cuántos días del rango tienen nota */
  readonly noteCount: number;
}

/**
 * Trae los registros de un rango de fechas (semana, mes o año) y ya calcula
 * cuántas veces ocurre cada color y el promedio de las notas. Sirve para
 * pintar el calendario, el contador de las referencias y el promedio.
 */
export class GetMoodRange {
  constructor(private readonly repository: MoodRepository) {}

  async execute(start: IsoDate, end: IsoDate): Promise<MoodRangeResult> {
    const entries = await this.repository.getEntriesInRange(start, end);

    const entriesByDate: Record<IsoDate, MoodEntry> = {};
    const colorCounts = emptyMoodColorCounts();
    let noteSum = 0;
    let noteCount = 0;

    for (const entry of entries) {
      entriesByDate[entry.date] = entry;
      for (const color of entry.colors) {
        colorCounts[color] += 1;
      }
      if (entry.note != null) {
        noteSum += entry.note;
        noteCount += 1;
      }
    }

    const noteAverage = noteCount > 0 ? Math.round((noteSum / noteCount) * 10) / 10 : null;

    return { start, end, entriesByDate, colorCounts, noteAverage, noteCount };
  }
}
