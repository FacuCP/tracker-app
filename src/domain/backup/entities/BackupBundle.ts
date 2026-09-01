/**
 * Un backup es una foto de todo lo guardado localmente. Se exporta como
 * archivo JSON y se puede volver a importar (por ejemplo si reinstalás la app
 * o cambiás de teléfono).
 */
export const BACKUP_FORMAT = 'app-celu-backup';
export const BACKUP_VERSION = 1;

export interface BackupBundle {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: number;
  readonly exportedAt: string;
  /** Contenido de cada clave de storage, ya parseado a objeto. */
  readonly data: Record<string, unknown>;
}

/** Valida un objeto cualquiera (venido de un archivo) y lo tipa como BackupBundle. */
export function parseBackupBundle(raw: unknown): BackupBundle {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('El archivo no parece un backup válido');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== BACKUP_FORMAT) {
    throw new Error('El archivo no es un backup de esta app');
  }
  if (obj.data == null || typeof obj.data !== 'object') {
    throw new Error('El backup no tiene datos');
  }
  return {
    format: BACKUP_FORMAT,
    version: typeof obj.version === 'number' ? obj.version : 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    data: obj.data as Record<string, unknown>,
  };
}
