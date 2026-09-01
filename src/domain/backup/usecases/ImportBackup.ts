import { parseBackupBundle } from '../entities/BackupBundle';
import { BackupRepository } from '../repositories/BackupRepository';

/**
 * Valida un objeto venido de un archivo y, si es un backup válido, reemplaza
 * con él todo el almacenamiento local.
 */
export class ImportBackup {
  constructor(private readonly repository: BackupRepository) {}

  async execute(raw: unknown): Promise<void> {
    const bundle = parseBackupBundle(raw);
    await this.repository.restoreBundle(bundle);
  }
}
