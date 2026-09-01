import { NOTE_MAX, NOTE_MIN } from '../../domain/mood/entities/MoodEntry';

export interface ParsedNote {
  /** Valor numérico si el texto es una nota válida. */
  note?: number;
  /** Mensaje de error si el texto no está vacío pero es inválido. */
  error?: string;
}

/**
 * Interpreta lo que el usuario tipeó en el campo "Nota". Acepta coma o punto
 * como separador decimal. Texto vacío = sin nota (válido).
 */
export function parseNoteInput(raw: string): ParsedNote {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') {
    return {};
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { error: 'Nota inválida' };
  }
  if (value < NOTE_MIN || value > NOTE_MAX) {
    return { error: `Debe estar entre ${NOTE_MIN} y ${NOTE_MAX}` };
  }
  if (Math.round(value * 10) !== value * 10) {
    return { error: 'Hasta un decimal' };
  }
  return { note: value };
}

/** Cómo se muestra una nota: "7" u "7.5". */
export function formatNote(note: number): string {
  return String(note);
}
