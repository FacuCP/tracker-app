import AsyncStorage from '@react-native-async-storage/async-storage';

import { BACKUP_FOLDER_URI_KEY } from '../../core/storage/keys';
import { BackupFolderRepository } from '../../domain/backup/repositories/BackupFolderRepository';

/** Guarda la URI de la carpeta elegida para "Descargar backup" como texto plano. */
export class BackupFolderRepositoryImpl implements BackupFolderRepository {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(BACKUP_FOLDER_URI_KEY);
  }

  async save(uri: string): Promise<void> {
    await AsyncStorage.setItem(BACKUP_FOLDER_URI_KEY, uri);
  }
}
