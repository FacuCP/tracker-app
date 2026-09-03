import { IsoDate } from '../../../core/utils/date';
import {
  FinanceAmountChange,
  FinanceKind,
  FinanceRepeat,
  FinanceTransaction,
  createFinanceTransaction,
} from '../entities/FinanceTransaction';
import { FinanceTransactionRepository } from '../repositories/FinanceTransactionRepository';

export interface SaveFinanceTransactionInput {
  /** Si viene, se edita ese movimiento; si no, se crea uno nuevo. */
  id?: string;
  kind: FinanceKind;
  name: string;
  date: IsoDate;
  comment?: string;
  amount: number;
  categoryId?: string;
  repeat?: FinanceRepeat | null;
  adjustments?: readonly FinanceAmountChange[];
  finishedOn?: IsoDate;
}

/** Crea o actualiza un movimiento (ingreso o gasto). */
export class SaveFinanceTransaction {
  constructor(
    private readonly repository: FinanceTransactionRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(input: SaveFinanceTransactionInput): Promise<FinanceTransaction> {
    const transaction = createFinanceTransaction({
      id: input.id ?? this.generateId(),
      kind: input.kind,
      name: input.name,
      date: input.date,
      comment: input.comment,
      amount: input.amount,
      categoryId: input.categoryId,
      repeat: input.repeat,
      adjustments: input.adjustments,
      finishedOn: input.finishedOn,
    });
    await this.repository.save(transaction);
    return transaction;
  }
}
