import { FinanceTransaction } from '../entities/FinanceTransaction';
import { FinanceTransactionRepository } from '../repositories/FinanceTransactionRepository';

/** Todos los movimientos, del más reciente al más viejo. */
export class GetFinanceTransactions {
  constructor(private readonly repository: FinanceTransactionRepository) {}

  async execute(): Promise<FinanceTransaction[]> {
    const transactions = await this.repository.getAll();
    return transactions.sort(
      (a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, 'es'),
    );
  }
}
