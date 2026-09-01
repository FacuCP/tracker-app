import { BackupBundle } from '../entities/BackupBundle';

/** Puerto para exportar/restaurar todo el almacenamiento local de la app. */
export interface BackupRepository {
  /** Arma un bundle con todo lo que hay guardado ahora. */
  createBundle(): Promise<BackupBundle>;
  /** Reemplaza el almacenamiento local con el contenido del bundle. */
  restoreBundle(bundle: BackupBundle): Promise<void>;
}
