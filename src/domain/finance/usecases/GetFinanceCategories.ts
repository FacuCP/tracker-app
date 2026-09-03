import { FinanceCategory } from '../entities/FinanceCategory';
import { FinanceCategoryRepository } from '../repositories/FinanceCategoryRepository';

/** Categorías de finanzas, ordenadas alfabéticamente. */
export class GetFinanceCategories {
  constructor(private readonly repository: FinanceCategoryRepository) {}

  async execute(): Promise<FinanceCategory[]> {
    const categories = await this.repository.getAll();
    return categories.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }
}
