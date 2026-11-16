import { BackupFolderRepository } from '../repositories/BackupFolderRepository';

/** Carpeta recordada para "Descargar backup", si ya se eligió una antes. */
export class GetBackupFolderUri {
  constructor(private readonly repository: BackupFolderRepository) {}

  execute(): Promise<string | null> {
    return this.repository.get();
  }
}
