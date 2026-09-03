import { FinanceCategoryRepository } from '../repositories/FinanceCategoryRepository';

/**
 * Borra una categoría. Los movimientos que la tenían quedan sin categoría
 * (pasan a mostrarse como "General").
 */
export class DeleteFinanceCategory {
  constructor(private readonly repository: FinanceCategoryRepository) {}

  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
