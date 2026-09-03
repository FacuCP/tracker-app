import { FinanceTransaction } from '../entities/FinanceTransaction';

/** Puerto para el CRUD de los movimientos de finanzas. */
export interface FinanceTransactionRepository {
  getAll(): Promise<FinanceTransaction[]>;
  getById(id: string): Promise<FinanceTransaction | null>;
  save(transaction: FinanceTransaction): Promise<void>;
  delete(id: string): Promise<void>;
}
