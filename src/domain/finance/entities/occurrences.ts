import { IsoDate, addDays, addMonthsClamped, fromIsoDate, toIsoDate } from '../../../core/utils/date';
import { FinanceTransaction } from './FinanceTransaction';

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
 * `[startIso, endIso]` (ambos inclusive). Contempla la repetición (por días o
 * por meses, con fin por fecha/cantidad/indefinida — igual que
 * `eventOccurrencesInRange`), los ajustes de monto y la fecha de
 * finalización manual (`finishedOn`).
 */
export function financeOccurrencesInRange(
  tx: FinanceTransaction,
  startIso: IsoDate,
  endIso: IsoDate,
): FinanceOccurrence[] {
  const repeat = tx.repeat;
  let effectiveEnd =
    repeat?.endType === 'onDate' && repeat.endDate && repeat.endDate < endIso ? repeat.endDate : endIso;
  if (tx.finishedOn && tx.finishedOn < effectiveEnd) effectiveEnd = tx.finishedOn;
  if (effectiveEnd < tx.date) return [];

  const base = fromIsoDate(tx.date);
  const intervalValue = repeat?.intervalValue ?? 1;
  const limit = !repeat ? 1 : repeat.endType === 'afterCount' ? repeat.count ?? 1 : MAX_OCCURRENCES;
  const out: FinanceOccurrence[] = [];

  for (let i = 0; i < limit && i < MAX_OCCURRENCES; i += 1) {
    const stepDate =
      repeat?.intervalUnit === 'days' ? addDays(base, i * intervalValue) : addMonthsClamped(base, i * intervalValue);
    const iso = toIsoDate(stepDate);
    if (iso > effectiveEnd) break;
    if (iso >= startIso) {
      out.push({ date: iso, amount: financeAmountOn(tx, iso), index: i });
    }
  }
  return out;
}
