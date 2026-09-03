import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toIsoDate,
} from '../../core/utils/date';

export type FinancePeriod = 'week' | 'month' | 'year';

export const FINANCE_PERIODS: { key: FinancePeriod; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
];

/** Rango ISO `[inicio, fin]` del período actual (semana/mes/año que contiene hoy). */
export function financePeriodRange(period: FinancePeriod): [string, string] {
  const now = new Date();
  if (period === 'week') return [toIsoDate(startOfWeek(now)), toIsoDate(endOfWeek(now))];
  if (period === 'year') return [toIsoDate(startOfYear(now)), toIsoDate(endOfYear(now))];
  return [toIsoDate(startOfMonth(now)), toIsoDate(endOfMonth(now))];
}
