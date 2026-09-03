import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { generateId } from '../../../core/utils/id';
import { DEFAULT_FINANCE_CATEGORIES } from '../../../domain/finance/entities/FinanceCategory';
import { FinanceCategoryDto } from '../dto/FinanceCategoryDto';

/**
 * Fuente de datos local de las categorías (un blob JSON indexado por id). La
 * primera vez (clave ausente) siembra las categorías por defecto; si el usuario
 * las borra todas, la clave queda como `{}` y no se vuelven a sembrar.
 */
export interface FinanceCategoryLocalDataSource {
  readAll(): Promise<Record<string, FinanceCategoryDto>>;
  write(category: FinanceCategoryDto): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.financeCategories;

export class AsyncStorageFinanceCategoryLocalDataSource implements FinanceCategoryLocalDataSource {
  async readAll(): Promise<Record<string, FinanceCategoryDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      const seeded: Record<string, FinanceCategoryDto> = {};
      for (const def of DEFAULT_FINANCE_CATEGORIES) {
        const id = generateId();
        seeded[id] = { id, name: def.name, color: def.color };
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try {
      return (JSON.parse(raw) as Record<string, FinanceCategoryDto>) ?? {};
    } catch {
      return {};
    }
  }

  private async readRaw(): Promise<Record<string, FinanceCategoryDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, FinanceCategoryDto>) ?? {};
    } catch {
      return {};
    }
  }

  async write(category: FinanceCategoryDto): Promise<void> {
    const all = await this.readRaw();
    all[category.id] = category;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.readRaw();
    delete all[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
