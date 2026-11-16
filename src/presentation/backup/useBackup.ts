import { useState } from 'react';
import { Directory } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { container } from '../../core/di/container';
import { todayIso } from '../../core/utils/date';

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; action: 'export' | 'download' | 'import' }
  | { kind: 'ok'; text: string }
  | { kind: 'error'; text: string };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error';
}

/** El picker de carpeta (Android/iOS) tira esto si el usuario lo cierra sin elegir nada — no es un error real. */
function isPickerCancelled(error: unknown): boolean {
  return messageOf(error).toLowerCase().includes('cancel');
}

async function backupJson(): Promise<string> {
  const bundle = await container.exportBackup.execute();
  return JSON.stringify(bundle, null, 2);
}

function backupFileName(): string {
  return `app-celu-backup-${todayIso()}.json`;
}

/** URI inicial "bien conocida" de la carpeta pública Documentos en Android, para que el picker de carpeta abra ahí directo en vez de en la raíz. */
const ANDROID_DOCUMENTS_URI = 'content://com.android.externalstorage.documents/document/primary%3ADocuments';

/** Subcarpeta propia de la app dentro de Documentos, para no mezclar los backups con el resto de los archivos ahí. */
const BACKUP_SUBFOLDER_NAME = 'TrackerAppBackups';

/** Busca la subcarpeta de backups dentro de `parent`, o la crea si todavía no existe. */
function ensureBackupSubfolder(parent: Directory): Directory {
  const existing = parent
    .list()
    .find((entry): entry is Directory => entry instanceof Directory && entry.name === BACKUP_SUBFOLDER_NAME);
  return existing ?? parent.createDirectory(BACKUP_SUBFOLDER_NAME);
}

/**
 * Carpeta para "Descargar backup": la primera vez abre el picker nativo ya
 * posicionado en Documentos (`initialUri`) — alcanza con tocar "Usar esta
 * carpeta", sin tener que navegar — crea (o reusa) ahí la subcarpeta
 * "TrackerAppBackups" y guarda esa elección (`saveBackupFolderUri`, el
 * permiso de SAF en Android es persistente). De ahí en más se reusa directo,
 * sin volver a mostrar el picker ni volver a crear la subcarpeta, salvo que
 * ya no exista o se haya revocado el permiso.
 */
async function getDownloadFolder(): Promise<Directory> {
  const savedUri = await container.getBackupFolderUri.execute();
  if (savedUri) {
    try {
      const remembered = new Directory(savedUri);
      if (remembered.exists) return remembered;
    } catch {
      // URI inválida o permiso revocado — se vuelve a pedir abajo.
    }
  }
  const documents = await Directory.pickDirectoryAsync(ANDROID_DOCUMENTS_URI);
  const subfolder = ensureBackupSubfolder(documents);
  await container.saveBackupFolderUri.execute(subfolder.uri);
  return subfolder;
}

/**
 * ViewModel de la pantalla de backup: exportar todos los datos a un archivo
 * JSON (para guardarlo o mandártelo), descargarlo directo a una carpeta del
 * dispositivo sin pasar por compartir, e importar uno para restaurar.
 */
export function useBackup() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function exportData() {
    setStatus({ kind: 'working', action: 'export' });
    try {
      const json = await backupJson();
      const uri = `${FileSystem.cacheDirectory}${backupFileName()}`;
      await FileSystem.writeAsStringAsync(uri, json);

      if (!(await Sharing.isAvailableAsync())) {
        setStatus({ kind: 'error', text: 'Este dispositivo no permite compartir archivos' });
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: 'Guardar backup de app-celu',
        UTI: 'public.json',
      });
      setStatus({ kind: 'ok', text: 'Backup generado. Guardalo en un lugar seguro.' });
    } catch (error) {
      setStatus({ kind: 'error', text: messageOf(error) });
    }
  }

  /**
   * Descarga el backup directo a Documentos/TrackerAppBackups, sin pasar por
   * la hoja de "Compartir" ni por elegir carpeta cada vez — ver
   * `getDownloadFolder`. Si la primera vez el usuario cierra el picker sin
   * elegir nada, no se considera un error.
   */
  async function downloadData() {
    setStatus({ kind: 'working', action: 'download' });
    try {
      const json = await backupJson();
      const directory = await getDownloadFolder();
      const file = directory.createFile(backupFileName(), 'application/json');
      await file.write(json);
      setStatus({ kind: 'ok', text: 'Backup descargado en Documentos/TrackerAppBackups.' });
    } catch (error) {
      if (isPickerCancelled(error)) {
        setStatus({ kind: 'idle' });
        return;
      }
      setStatus({ kind: 'error', text: messageOf(error) });
    }
  }

  async function importData(onRestored: () => void) {
    setStatus({ kind: 'working', action: 'import' });
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (picked.canceled) {
        setStatus({ kind: 'idle' });
        return;
      }

      const content = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      await container.importBackup.execute(JSON.parse(content));

      setStatus({ kind: 'ok', text: 'Datos restaurados desde el backup.' });
      onRestored();
    } catch (error) {
      setStatus({ kind: 'error', text: messageOf(error) });
    }
  }

  return { status, exportData, downloadData, importData };
}
