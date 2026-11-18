/**
 * Tipo de contenido de un mensaje. `'text'` es el caso de siempre; los otros
 * tres llevan un archivo (`media`) y no tienen texto (sin subtítulo/caption,
 * a propósito, para la primera versión).
 */
export type NoteMessageKind = 'text' | 'image' | 'document' | 'audio';

/**
 * Datos del archivo de un mensaje de medios. `fileName` es el nombre del
 * archivo ya copiado a la carpeta de medios de la app (ver
 * `src/data/note/noteMediaStorage.ts`) — nunca una uri del picker/grabador,
 * que puede dejar de ser válida. `durationMillis` solo tiene sentido para
 * audio.
 */
export interface NoteMessageMedia {
  readonly fileName: string;
  readonly mimeType: string;
  readonly originalName?: string;
  readonly fileSize?: number;
  readonly durationMillis?: number;
}

/**
 * Un mensaje dentro de una o más anotaciones: texto (o un archivo), cuándo
 * se mandó, y opcionalmente a qué otro mensaje responde. `sentAt` es una
 * fecha y hora completa (ISO), no solo el día — hace falta la hora para
 * mostrarla en el chat.
 *
 * `noteIds` reemplaza al viejo `noteId` único: un mensaje puede pertenecer a
 * varias anotaciones a la vez (agregarlo a una, sacarlo de otra) sin que
 * cambie nada más de él — por eso vive separado de `SaveNoteMessage`, en su
 * propio usecase (`SetNoteMessageNotes`). Nunca vacío: un mensaje sin
 * ninguna anotación no tiene sentido, en ese caso se borra en vez de
 * quedarse con `noteIds: []`.
 */
export interface NoteMessage {
  readonly id: string;
  readonly noteIds: readonly string[];
  readonly kind: NoteMessageKind;
  /** Vacío (`''`) para mensajes de medios — no tienen subtítulo. */
  readonly text: string;
  /** Presente si `kind` es `'document'` o `'audio'` (uno solo). Para `'image'`, ver `mediaItems`. */
  readonly media?: NoteMessageMedia;
  /**
   * Varias fotos mandadas juntas, como un solo mensaje (hasta
   * `MAX_NOTE_IMAGE_ITEMS`) — solo tiene sentido con `kind === 'image'`.
   * Mensajes de foto de antes de que existiera esto siguen usando `media`
   * (una sola) — ver `noteMessageMediaItems` para leer cualquiera de los dos
   * casos de forma uniforme.
   */
  readonly mediaItems?: readonly NoteMessageMedia[];
  readonly sentAt: string;
  /**
   * Id del mensaje al que responde, si corresponde (deslizar para
   * responder). No se valida que ese id exista acá: si el mensaje citado se
   * borró de verdad, quien lo muestra no encuentra nada y no muestra la
   * cita; si solo se lo sacó de esta anotación (sigue existiendo en otra),
   * sigue mostrándose con normalidad.
   */
  readonly replyToId?: string;
  /** Cuándo se editó por última vez, si se editó. `sentAt` nunca cambia. */
  readonly editedAt?: string;
  /** Marcado como favorito (estrella) — vale para todas las anotaciones a las que pertenece, no por anotación. */
  readonly favorite?: boolean;
}

export const MAX_NOTE_MESSAGE_LENGTH = 2000;
export const MAX_NOTE_IMAGE_ITEMS = 4;

/** Texto corto para mostrar un mensaje donde no entra su contenido real (cita, chip de "respondiendo a", copiar). */
export function noteMessagePreviewText(message: NoteMessage): string {
  if (message.kind === 'text') return message.text;
  if (message.kind === 'image') return noteMessageMediaItems(message).length > 1 ? '[Fotos]' : '[Foto]';
  if (message.kind === 'document') return '[Documento]';
  return '[Audio]';
}

/** Lee `mediaItems`/`media` de forma uniforme — siempre una lista, sin importar cuál de los dos tiene el mensaje. */
export function noteMessageMediaItems(message: NoteMessage): readonly NoteMessageMedia[] {
  if (message.mediaItems && message.mediaItems.length > 0) return message.mediaItems;
  return message.media ? [message.media] : [];
}

export function createNoteMessage(params: {
  id: string;
  noteIds: readonly string[];
  kind?: NoteMessageKind;
  text?: string;
  media?: NoteMessageMedia;
  mediaItems?: readonly NoteMessageMedia[];
  sentAt: string;
  replyToId?: string;
  editedAt?: string;
  favorite?: boolean;
}): NoteMessage {
  const kind = params.kind ?? 'text';

  if (params.noteIds.length === 0) {
    throw new Error('El mensaje tiene que pertenecer a alguna anotación');
  }

  const text = (params.text ?? '').trim();
  if (kind === 'text') {
    if (text.length === 0) {
      throw new Error('El mensaje no puede estar vacío');
    }
  } else if (kind === 'image') {
    const count = params.mediaItems?.length ?? (params.media ? 1 : 0);
    if (count === 0) {
      throw new Error('Falta el archivo del mensaje');
    }
    if (count > MAX_NOTE_IMAGE_ITEMS) {
      throw new Error(`No se pueden mandar más de ${MAX_NOTE_IMAGE_ITEMS} fotos juntas`);
    }
  } else if (!params.media) {
    throw new Error('Falta el archivo del mensaje');
  }
  if (text.length > MAX_NOTE_MESSAGE_LENGTH) {
    throw new Error(`El mensaje no puede superar los ${MAX_NOTE_MESSAGE_LENGTH} caracteres`);
  }
  if (!params.sentAt) {
    throw new Error('Falta la fecha de envío');
  }

  return {
    id: params.id,
    noteIds: params.noteIds,
    kind,
    text,
    media: params.media,
    mediaItems: params.mediaItems,
    sentAt: params.sentAt,
    replyToId: params.replyToId,
    editedAt: params.editedAt,
    favorite: params.favorite ? true : undefined,
  };
}
