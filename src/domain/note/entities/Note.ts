import { IsoDate } from '../../../core/utils/date';

/**
 * Una anotación: un grupo de chat con nombre. El contenido son sus mensajes
 * (`NoteMessage`).
 */
export interface Note {
  readonly id: string;
  readonly name: string;
  readonly createdAt: IsoDate;
  /** Si está marcada como favorita (aparece en la pestaña Favoritos). */
  readonly favorite: boolean;
}

export const MAX_NOTE_NAME = 40;

export function createNote(params: {
  id: string;
  name: string;
  createdAt: IsoDate;
  favorite?: boolean;
}): Note {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('La anotación necesita un nombre');
  }
  if (name.length > MAX_NOTE_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_NOTE_NAME} caracteres`);
  }
  return {
    id: params.id,
    name,
    createdAt: params.createdAt,
    favorite: params.favorite ?? false,
  };
}
