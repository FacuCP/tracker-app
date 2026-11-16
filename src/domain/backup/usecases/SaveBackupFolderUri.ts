import { BackupFolderRepository } from '../repositories/BackupFolderRepository';

/** Recuerda la carpeta elegida para "Descargar backup", para no preguntar de nuevo la próxima vez. */
export class SaveBackupFolderUri {
  constructor(private readonly repository: BackupFolderRepository) {}

  execute(uri: string): Promise<void> {
    return this.repository.save(uri);
  }
}
