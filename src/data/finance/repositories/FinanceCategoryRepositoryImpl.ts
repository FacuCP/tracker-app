import { FinanceCategory } from '../../../domain/finance/entities/FinanceCategory';
import { FinanceCategoryRepository } from '../../../domain/finance/repositories/FinanceCategoryRepository';
import { FinanceCategoryLocalDataSource } from '../datasources/FinanceCategoryLocalDataSource';
import { financeCategoryFromDto, financeCategoryToDto } from '../dto/FinanceCategoryDto';

export class FinanceCategoryRepositoryImpl implements FinanceCategoryRepository {
  constructor(private readonly local: FinanceCategoryLocalDataSource) {}

  async getAll(): Promise<FinanceCategory[]> {
    const all = await this.local.readAll();
    return Object.values(all).map(financeCategoryFromDto);
  }

  async save(category: FinanceCategory): Promise<void> {
    await this.local.write(financeCategoryToDto(category));
  }

  async delete(id: string): Promise<void> {
    await this.local.remove(id);
  }
}
