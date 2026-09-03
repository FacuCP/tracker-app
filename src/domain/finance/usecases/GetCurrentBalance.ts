import { todayIso } from '../../../core/utils/date';
import { financeKindSign } from '../entities/FinanceTransaction';
import { financeOccurrencesInRange } from '../entities/occurrences';
import { FinanceTransactionRepository } from '../repositories/FinanceTransactionRepository';

/**
 * Economía actual: suma de todos los ingresos menos todos los gastos, contando
 * cada repetición mensual que ya ocurrió hasta hoy (con el monto vigente).
 */
export class GetCurrentBalance {
  constructor(private readonly repository: FinanceTransactionRepository) {}

  async execute(): Promise<number> {
    const today = todayIso();
    const transactions = await this.repository.getAll();
    let total = 0;
    for (const tx of transactions) {
      const sign = financeKindSign(tx.kind);
      for (const occ of financeOccurrencesInRange(tx, tx.date, today)) {
        total += sign * occ.amount;
      }
    }
    return Math.round(total * 100) / 100;
  }
}
