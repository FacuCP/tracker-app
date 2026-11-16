/**
 * Puerto para recordar la carpeta elegida por el usuario para "Descargar
 * backup", así no hay que volver a elegirla cada vez. Es un detalle del
 * dispositivo (la URI de permiso de SAF en Android), no datos del usuario —
 * por eso vive aparte de `STORAGE_KEYS`, fuera del backup en sí.
 */
export interface BackupFolderRepository {
  get(): Promise<string | null>;
  save(uri: string): Promise<void>;
}
