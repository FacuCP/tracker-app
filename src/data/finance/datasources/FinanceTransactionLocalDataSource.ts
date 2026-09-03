import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { FinanceTransactionDto } from '../dto/FinanceTransactionDto';

/** Fuente de datos local de los movimientos (un blob JSON indexado por id). */
export interface FinanceTransactionLocalDataSource {
  readAll(): Promise<Record<string, FinanceTransactionDto>>;
  write(transaction: FinanceTransactionDto): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.financeTransactions;

export class AsyncStorageFinanceTransactionLocalDataSource
  implements FinanceTransactionLocalDataSource
{
  async readAll(): Promise<Record<string, FinanceTransactionDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, FinanceTransactionDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(transaction: FinanceTransactionDto): Promise<void> {
    const all = await this.readAll();
    all[transaction.id] = transaction;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    delete all[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
