import { FinanceTransactionRepository } from '../repositories/FinanceTransactionRepository';

/** Borra un movimiento (todas sus repeticiones futuras dejan de contar). */
export class DeleteFinanceTransaction {
  constructor(private readonly repository: FinanceTransactionRepository) {}

  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
