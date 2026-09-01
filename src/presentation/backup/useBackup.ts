import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { container } from '../../core/di/container';
import { todayIso } from '../../core/utils/date';

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; action: 'export' | 'import' }
  | { kind: 'ok'; text: string }
  | { kind: 'error'; text: string };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error';
}

/**
 * ViewModel de la pantalla de backup: exportar todos los datos a un archivo
 * JSON (para guardarlo o mandártelo) e importar uno para restaurar.
 */
export function useBackup() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function exportData() {
    setStatus({ kind: 'working', action: 'export' });
    try {
      const bundle = await container.exportBackup.execute();
      const json = JSON.stringify(bundle, null, 2);
      const uri = `${FileSystem.cacheDirectory}app-celu-backup-${todayIso()}.json`;
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

  return { status, exportData, importData };
}
