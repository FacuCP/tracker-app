import { IsoDate } from '../../../core/utils/date';
import { MOOD_COLORS, MoodColor, MoodColorCounts, emptyMoodColorCounts } from '../entities/MoodColor';
import { MoodEntry } from '../entities/MoodEntry';
import { MoodRepository } from '../repositories/MoodRepository';

/** Mes (0-11) con más ocurrencias de cada color, o null si no hubo ninguna. */
export type MoodTopMonthByColor = Record<MoodColor, number | null>;

export interface MoodRangeResult {
  readonly start: IsoDate;
  readonly end: IsoDate;
  /** Registros del rango indexados por fecha ISO */
  readonly entriesByDate: Record<IsoDate, MoodEntry>;
  /**
   * Cuántas veces aparece cada color en el rango. Un día con **un** color suma
   * 1; un día con **dos** colores suma 0.5 a cada uno.
   */
  readonly colorCounts: MoodColorCounts;
  /** Mes con más ocurrencias de cada color (útil solo en la vista Año). */
  readonly topMonthByColor: MoodTopMonthByColor;
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
    const monthCountsByColor = {} as Record<MoodColor, number[]>;
    for (const info of MOOD_COLORS) {
      monthCountsByColor[info.color] = Array<number>(12).fill(0);
    }
    let noteSum = 0;
    let noteCount = 0;

    for (const entry of entries) {
      entriesByDate[entry.date] = entry;
      const weight = entry.colors.length === 1 ? 1 : 0.5;
      const month = Number(entry.date.slice(5, 7)) - 1;
      for (const color of entry.colors) {
        colorCounts[color] += weight;
        if (month >= 0 && month <= 11) {
          monthCountsByColor[color][month] += weight;
        }
      }
      if (entry.note != null) {
        noteSum += entry.note;
        noteCount += 1;
      }
    }

    const topMonthByColor = {} as MoodTopMonthByColor;
    for (const info of MOOD_COLORS) {
      colorCounts[info.color] = Math.round(colorCounts[info.color] * 2) / 2;
      const perMonth = monthCountsByColor[info.color];
      let best = 0;
      let bestMonth: number | null = null;
      for (let m = 0; m < 12; m += 1) {
        if (perMonth[m] > best) {
          best = perMonth[m];
          bestMonth = m;
        }
      }
      topMonthByColor[info.color] = bestMonth;
    }

    const noteAverage = noteCount > 0 ? Math.round((noteSum / noteCount) * 10) / 10 : null;

    return { start, end, entriesByDate, colorCounts, topMonthByColor, noteAverage, noteCount };
  }
}
