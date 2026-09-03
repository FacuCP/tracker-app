import { IsoDate } from '../../../core/utils/date';
import {
  FinanceAmountChange,
  FinanceKind,
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
  /** Ausente = no se repite. `months: null` = indefinida. */
  repeat?: { months: number | null } | null;
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
    repeat: tx.repeat ? { months: tx.repeat.months } : undefined,
    adjustments:
      tx.adjustments.length > 0
        ? tx.adjustments.map((a) => ({ from: a.from, amount: a.amount }))
        : undefined,
    finishedOn: tx.finishedOn,
  };
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
    repeat: dto.repeat ? { months: dto.repeat.months ?? null } : null,
    adjustments,
    finishedOn: dto.finishedOn as IsoDate | undefined,
  });
}
