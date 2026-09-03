import { FinanceTransaction } from '../../../domain/finance/entities/FinanceTransaction';
import { FinanceTransactionRepository } from '../../../domain/finance/repositories/FinanceTransactionRepository';
import { FinanceTransactionLocalDataSource } from '../datasources/FinanceTransactionLocalDataSource';
import { financeTransactionFromDto, financeTransactionToDto } from '../dto/FinanceTransactionDto';

export class FinanceTransactionRepositoryImpl implements FinanceTransactionRepository {
  constructor(private readonly local: FinanceTransactionLocalDataSource) {}

  async getAll(): Promise<FinanceTransaction[]> {
    const all = await this.local.readAll();
    return Object.values(all).map(financeTransactionFromDto);
  }

  async getById(id: string): Promise<FinanceTransaction | null> {
    const all = await this.local.readAll();
    const dto = all[id];
    return dto ? financeTransactionFromDto(dto) : null;
  }

  async save(transaction: FinanceTransaction): Promise<void> {
    await this.local.write(financeTransactionToDto(transaction));
  }

  async delete(id: string): Promise<void> {
    await this.local.remove(id);
  }
}
