import { FinanceCategory } from '../entities/FinanceCategory';

/** Puerto para el CRUD de las categorías de finanzas. */
export interface FinanceCategoryRepository {
  getAll(): Promise<FinanceCategory[]>;
  save(category: FinanceCategory): Promise<void>;
  delete(id: string): Promise<void>;
}
