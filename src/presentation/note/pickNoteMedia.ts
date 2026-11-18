import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { copyIntoNoteMedia } from '../../data/note/noteMediaStorage';
import { MAX_NOTE_IMAGE_ITEMS, NoteMessageKind, NoteMessageMedia } from '../../domain/note/entities/NoteMessage';

const MAX_DOCUMENTS_PER_PICK = 5;

export interface PickedNoteMedia {
  kind: NoteMessageKind;
  /** Para `'document'`/`'audio'` (uno solo). */
  media?: NoteMessageMedia;
  /** Para `'image'` — una o varias fotos juntas, como un solo mensaje. */
  mediaItems?: NoteMessageMedia[];
}

/**
 * Abre la galería y deja elegir hasta `MAX_NOTE_IMAGE_ITEMS` fotos (tope
 * puesto por el propio picker vía `selectionLimit` — a diferencia de
 * documentos, no hace falta recortar a mano). Copia cada una a la carpeta de
 * medios de la app antes de devolverla — lo que se guarda en el mensaje es
 * el nombre ya copiado, nunca la uri de la galería.
 *
 * Todas las fotos elegidas de una van en un solo elemento (`mediaItems`),
 * no uno por foto: se mandan como un único mensaje con cuadrícula (ver
 * #139), no como mensajes separados.
 */
export async function pickNotePhotos(): Promise<PickedNoteMedia[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_NOTE_IMAGE_ITEMS,
  });
  if (result.canceled || result.assets.length === 0) return [];

  const mediaItems: NoteMessageMedia[] = [];
  for (const asset of result.assets) {
    const suggestedName = asset.fileName ?? `foto-${Date.now()}.jpg`;
    const fileName = await copyIntoNoteMedia(asset.uri, suggestedName);
    mediaItems.push({
      fileName,
      mimeType: asset.mimeType ?? 'image/jpeg',
      originalName: asset.fileName ?? undefined,
      fileSize: asset.fileSize,
    });
  }
  return [{ kind: 'image', mediaItems }];
}

/**
 * Abre el selector de documentos y deja elegir varios. A diferencia de
 * fotos, `expo-document-picker` no tiene un tope de cantidad propio —
 * se recorta a mano a 5 y se avisa si se eligieron más. Cada documento es
 * su propio mensaje (a diferencia de las fotos, no se agrupan).
 */
export async function pickNoteDocuments(): Promise<PickedNoteMedia[]> {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: false });
  if (result.canceled) return [];

  let assets = result.assets;
  if (assets.length > MAX_DOCUMENTS_PER_PICK) {
    Alert.alert(
      `Máximo ${MAX_DOCUMENTS_PER_PICK} por vez`,
      `Se eligieron ${assets.length}; solo se van a mandar los primeros ${MAX_DOCUMENTS_PER_PICK}.`,
    );
    assets = assets.slice(0, MAX_DOCUMENTS_PER_PICK);
  }

  const picked: PickedNoteMedia[] = [];
  for (const asset of assets) {
    const fileName = await copyIntoNoteMedia(asset.uri, asset.name);
    picked.push({
      kind: 'document',
      media: {
        fileName,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        originalName: asset.name,
        fileSize: asset.size ?? undefined,
      },
    });
  }
  return picked;
}
