import { IsoDate } from '../../../core/utils/date';
import {
  FinanceAmountChange,
  FinanceKind,
  FinanceRepeat,
  FinanceRepeatEndType,
  FinanceRepeatUnit,
  FinanceTransaction,
  createFinanceTransaction,
} from '../../../domain/finance/entities/FinanceTransaction';

export interface FinanceTransactionDto {
  id: string;
  kind: string;
  name: string;
  date: string;
  comment?: string;
  amount: number;
  categoryId?: string;
  /**
   * Ausente = no se repite. Formato actual: igual que la repetición de
   * eventos (intervalo + cómo termina). `months` es el formato viejo, de
   * antes de #102 (siempre cada 1 mes; `null` = indefinida, `N` = N veces) —
   * se sigue leyendo para no perder movimientos ya guardados.
   */
  repeat?: {
    intervalValue?: number;
    intervalUnit?: string;
    endType?: string;
    endDate?: string;
    count?: number;
    months?: number | null;
  } | null;
  adjustments?: { from: string; amount: number }[];
  finishedOn?: string;
}

export function financeTransactionToDto(tx: FinanceTransaction): FinanceTransactionDto {
  return {
    id: tx.id,
    kind: tx.kind,
    name: tx.name,
    date: tx.date,
    comment: tx.comment,
    amount: tx.amount,
    categoryId: tx.categoryId,
    repeat: tx.repeat
      ? {
          intervalValue: tx.repeat.intervalValue,
          intervalUnit: tx.repeat.intervalUnit,
          endType: tx.repeat.endType,
          endDate: tx.repeat.endDate,
          count: tx.repeat.count,
        }
      : undefined,
    adjustments:
      tx.adjustments.length > 0
        ? tx.adjustments.map((a) => ({ from: a.from, amount: a.amount }))
        : undefined,
    finishedOn: tx.finishedOn,
  };
}

/** Lee el `repeat` guardado, en formato actual o en el viejo `{ months }` (#102). */
function repeatFromDto(raw: FinanceTransactionDto['repeat']): FinanceRepeat | null {
  if (!raw) return null;
  if (typeof raw.intervalValue === 'number' && typeof raw.intervalUnit === 'string' && typeof raw.endType === 'string') {
    const intervalUnit: FinanceRepeatUnit = raw.intervalUnit === 'days' ? 'days' : 'months';
    const endType: FinanceRepeatEndType =
      raw.endType === 'onDate' ? 'onDate' : raw.endType === 'afterCount' ? 'afterCount' : 'never';
    return {
      intervalValue: raw.intervalValue,
      intervalUnit,
      endType,
      endDate: endType === 'onDate' ? (raw.endDate as IsoDate | undefined) : undefined,
      count: endType === 'afterCount' ? raw.count : undefined,
    };
  }
  const months = raw.months ?? null;
  return months == null
    ? { intervalValue: 1, intervalUnit: 'months', endType: 'never' }
    : { intervalValue: 1, intervalUnit: 'months', endType: 'afterCount', count: months };
}

export function financeTransactionFromDto(dto: FinanceTransactionDto): FinanceTransaction {
  const kind: FinanceKind = dto.kind === 'income' ? 'income' : 'expense';
  const adjustments: FinanceAmountChange[] = Array.isArray(dto.adjustments)
    ? dto.adjustments
        .filter((a) => typeof a?.from === 'string' && typeof a?.amount === 'number')
        .map((a) => ({ from: a.from as IsoDate, amount: a.amount }))
    : [];
  return createFinanceTransaction({
    id: dto.id,
    kind,
    name: dto.name,
    date: dto.date as IsoDate,
    comment: dto.comment,
    amount: dto.amount,
    categoryId: dto.categoryId,
    repeat: repeatFromDto(dto.repeat),
    adjustments,
    finishedOn: dto.finishedOn as IsoDate | undefined,
  });
}
