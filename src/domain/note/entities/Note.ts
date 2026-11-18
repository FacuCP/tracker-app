import { IsoDate } from '../../../core/utils/date';

/**
 * Una anotación: un grupo de chat con nombre. El contenido son sus mensajes
 * (`NoteMessage`).
 */
export interface Note {
  readonly id: string;
  readonly name: string;
  /** Corta, opcional — solo se puede poner al crear la anotación. */
  readonly description?: string;
  readonly createdAt: IsoDate;
  /** Si está marcada como favorita (aparece en la pestaña Favoritos). */
  readonly favorite: boolean;
}

export const MAX_NOTE_NAME = 40;
export const MAX_NOTE_DESCRIPTION = 100;

export function createNote(params: {
  id: string;
  name: string;
  description?: string;
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
  const description = params.description?.trim() || undefined;
  if (description != null && description.length > MAX_NOTE_DESCRIPTION) {
    throw new Error(`La descripción no puede superar los ${MAX_NOTE_DESCRIPTION} caracteres`);
  }
  return {
    id: params.id,
    name,
    description,
    createdAt: params.createdAt,
    favorite: params.favorite ?? false,
  };
}
