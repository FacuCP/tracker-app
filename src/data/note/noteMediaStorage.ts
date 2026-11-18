import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';

/**
 * Archivos de mensajes de medios (foto/documento/audio) de las anotaciones:
 * carpeta privada de la app (no la de Documentos pública que usa el backup
 * — esto no necesita ser visible para el usuario), bajo `Paths.document`.
 * Domain y presentation nunca ven una uri acá: solo un `fileName`, que es lo
 * único que se guarda en el mensaje — la uri de un picker/grabador puede
 * dejar de ser válida, un nombre de archivo propio no.
 *
 * Fuera del backup a propósito (pedido del usuario, ver #135/#136): el
 * backup solo toca `AsyncStorage` (`BackupRepositoryImpl`), nunca el
 * sistema de archivos, así que estos archivos ya quedan afuera sin hacer
 * nada más — lo único que viaja en el backup es la referencia
 * (`fileName`/`mimeType`) dentro del mensaje.
 */

const NOTE_MEDIA_FOLDER_NAME = 'NoteMedia';

function mediaFolder(): Directory {
  const folder = new Directory(Paths.document, NOTE_MEDIA_FOLDER_NAME);
  if (!folder.exists) {
    folder.create({ idempotent: true, intermediates: true });
  }
  return folder;
}

/**
 * Un nombre de archivo elegido por el usuario (sobre todo de documentos —
 * las fotos ya vienen con un nombre "de cámara" sin sorpresas) puede traer
 * espacios, acentos, paréntesis o cualquier otra cosa: se reemplaza todo lo
 * que no sea letra/número/punto/guión por `_` y se recorta a un largo
 * razonable, para no arriesgar el nombre de archivo final (prefijo +
 * nombre) con algo que la carpeta de medios no pueda crear.
 */
function sanitizeFileNamePart(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return safe.length > 80 ? safe.slice(-80) : safe;
}

/**
 * Copia un archivo recién elegido/grabado (uri de picker o del grabador,
 * `file://` o `content://`) a la carpeta de medios de la app, con un nombre
 * propio que no colisiona. Devuelve ese nombre — lo único que se guarda en
 * el mensaje.
 *
 * Ni `File.copy()` (API nueva) ni `copyAsync` (API legacy) resultaron
 * confiables para un archivo elegido por `expo-document-picker`: el primero
 * tiraba "Missing 'READ' permission" con la uri `content://` del selector
 * del sistema; el segundo, probado después, tiraba "isn't readable" incluso
 * ya con una uri `file://` de la caché de la propia app. En vez de copiar
 * (que depende de que las dos uris —origen y destino— sean compatibles
 * entre sí para la API elegida), se lee el archivo entero como texto
 * `base64` y se escribe ese texto en el destino — `readAsStringAsync` sí
 * sabe leer cualquiera de los dos tipos de uri (es el mismo mecanismo que
 * ya usa `useBackup.ts`, con el mismo picker, para importar un backup), y
 * escribir en el destino no depende de la uri de origen para nada.
 */
export async function copyIntoNoteMedia(sourceUri: string, suggestedName: string): Promise<string> {
  const folder = mediaFolder();
  const fileName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFileNamePart(suggestedName)}`;
  const destination = new File(folder, fileName);
  // En Expo Go las APIs de archivos solo dejan leer dentro de la carpeta
  // aislada de la app: la caché general donde los pickers dejan su copia
  // figura como "isn't readable" (ver #144). Por eso no hay una única
  // estrategia segura: se prueban en orden hasta que una funcione.
  const attempts: Array<() => Promise<void>> = [
    // 1) copia nativa legacy: sirve para `content://` y para `file://` propios.
    () => FileSystemLegacy.copyAsync({ from: sourceUri, to: destination.uri }),
    // 2) leer + escribir en base64 (no depende de que origen/destino sean compatibles).
    async () => {
      const base64 = await FileSystemLegacy.readAsStringAsync(sourceUri, { encoding: 'base64' });
      await FileSystemLegacy.writeAsStringAsync(destination.uri, base64, { encoding: 'base64' });
    },
    // 3) API nueva.
    async () => {
      new File(sourceUri).copy(destination);
    },
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      await attempt();
      if (destination.exists) return fileName;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('No se pudo copiar el archivo');
}

/** Resuelve un `fileName` ya guardado a una uri usable para mostrar/reproducir. */
export function noteMediaUri(fileName: string): string {
  return new File(mediaFolder(), fileName).uri;
}

/**
 * Si el archivo de verdad está en la carpeta de medios. `false` después de
 * restaurar un backup (que nunca incluyó el archivo, solo la referencia en
 * el mensaje) o si se borró por fuera de la app — quien muestra el mensaje
 * usa esto para mostrar un cartel en vez de romper.
 */
export function noteMediaExists(fileName: string): boolean {
  try {
    return new File(mediaFolder(), fileName).exists;
  } catch {
    return false;
  }
}

/** Mejor esfuerzo: si el archivo ya no está, no hay nada que limpiar. */
export function deleteNoteMedia(fileName: string): void {
  try {
    const file = new File(mediaFolder(), fileName);
    if (file.exists) file.delete();
  } catch {
    // Archivo ya ausente o inaccesible — nada que hacer.
  }
}

/**
 * Abre un documento con la app que corresponda a su tipo (visor de PDF,
 * Office, etc.). En Android usa un intent `VIEW` con una uri `content://`
 * (la `file://` propia no se puede entregar a otra app); si no hay ninguna
 * app capaz de abrirlo, o en iOS, cae al menú de compartir.
 */
export async function openNoteDocument(fileName: string, mimeType?: string): Promise<void> {
  const uri = noteMediaUri(fileName);
  if (Platform.OS === 'android') {
    try {
      const contentUri = await FileSystemLegacy.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: mimeType && mimeType !== 'application/octet-stream' ? mimeType : undefined,
      });
      return;
    } catch {
      // Sin app que lo abra: se ofrece compartir.
    }
  }
  await Sharing.shareAsync(uri);
}
