import { BackupBundle } from '../entities/BackupBundle';
import { BackupRepository } from '../repositories/BackupRepository';

/** Arma el backup con todos los datos actuales. */
export class ExportBackup {
  constructor(private readonly repository: BackupRepository) {}

  execute(): Promise<BackupBundle> {
    return this.repository.createBundle();
  }
}
