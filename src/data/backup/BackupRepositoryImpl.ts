import AsyncStorage from '@react-native-async-storage/async-storage';

import { ALL_STORAGE_KEYS } from '../../core/storage/keys';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupBundle,
} from '../../domain/backup/entities/BackupBundle';
import { BackupRepository } from '../../domain/backup/repositories/BackupRepository';

/**
 * Backup sobre AsyncStorage: recorre todas las claves conocidas de la app
 * (`ALL_STORAGE_KEYS`) para exportarlas, y las reemplaza al importar.
 */
export class BackupRepositoryImpl implements BackupRepository {
  async createBundle(): Promise<BackupBundle> {
    const pairs = await AsyncStorage.multiGet(ALL_STORAGE_KEYS);
    const data: Record<string, unknown> = {};

    for (const [key, value] of pairs) {
      if (value == null) continue;
      try {
        data[key] = JSON.parse(value);
      } catch {
        // Si una clave está corrupta, la dejamos afuera del backup.
      }
    }

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    };
  }

  async restoreBundle(bundle: BackupBundle): Promise<void> {
    // Restauración completa: primero limpiamos nuestras claves, después
    // escribimos las que trae el backup.
    await AsyncStorage.multiRemove(ALL_STORAGE_KEYS);

    const entries = ALL_STORAGE_KEYS.filter((key) => key in bundle.data).map(
      (key) => [key, JSON.stringify(bundle.data[key])] as [string, string],
    );

    if (entries.length > 0) {
      await AsyncStorage.multiSet(entries);
    }
  }
}
