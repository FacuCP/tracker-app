import { IsoDate, fromIsoDate, toIsoDate } from '../../../core/utils/date';
import { FinanceTransaction } from './FinanceTransaction';

/**
 * Suma meses a una fecha preservando el día. Si el mes destino es más corto
 * (p. ej. 31 de enero + 1 mes), lo clampa al último día de ese mes.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const totalMonths = date.getFullYear() * 12 + date.getMonth() + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(date.getDate(), lastDay));
}

/** Monto vigente del movimiento en la fecha `dateIso` (aplica los ajustes). */
export function financeAmountOn(tx: FinanceTransaction, dateIso: IsoDate): number {
  let amount = tx.amount;
  for (const change of tx.adjustments) {
    if (change.from <= dateIso) amount = change.amount;
    else break;
  }
  return amount;
}

export interface FinanceOccurrence {
  readonly date: IsoDate;
  readonly amount: number;
  /** Número de ocurrencia, 0 = la primera. */
  readonly index: number;
}

const MAX_OCCURRENCES = 5000;

/**
 * Ocurrencias del movimiento (fecha + monto vigente) dentro del rango
 * `[startIso, endIso]` (ambos inclusive). Contempla la repetición mensual, los
 * ajustes de monto y la fecha de finalización.
 */
export function financeOccurrencesInRange(
  tx: FinanceTransaction,
  startIso: IsoDate,
  endIso: IsoDate,
): FinanceOccurrence[] {
  const effectiveEnd = tx.finishedOn && tx.finishedOn < endIso ? tx.finishedOn : endIso;
  if (effectiveEnd < tx.date) return [];

  const base = fromIsoDate(tx.date);
  const limit = tx.repeat ? (tx.repeat.months ?? Number.POSITIVE_INFINITY) : 1;
  const out: FinanceOccurrence[] = [];

  for (let i = 0; i < limit && i < MAX_OCCURRENCES; i += 1) {
    const iso = toIsoDate(addMonthsClamped(base, i));
    if (iso > effectiveEnd) break;
    if (iso >= startIso) {
      out.push({ date: iso, amount: financeAmountOn(tx, iso), index: i });
    }
  }
  return out;
}
