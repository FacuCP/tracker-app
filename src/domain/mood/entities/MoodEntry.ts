import { IsoDate } from '../../../core/utils/date';
import { MoodColor } from './MoodColor';

/**
 * Registro de ánimo de un día. Puede tener uno o dos colores (no más, no
 * repetidos), una descripción opcional y una nota opcional del 1 al 10.
 */
export interface MoodEntry {
  readonly date: IsoDate;
  readonly colors: readonly MoodColor[];
  readonly description?: string;
  /** Nota del día, de NOTE_MIN a NOTE_MAX, con hasta un decimal. */
  readonly note?: number;
}

export const MAX_MOODS_PER_DAY = 2;
export const NOTE_MIN = 1;
export const NOTE_MAX = 10;

/** true si `note` está en rango y tiene a lo sumo un decimal. */
export function isValidNote(note: number): boolean {
  return (
    Number.isFinite(note) &&
    note >= NOTE_MIN &&
    note <= NOTE_MAX &&
    Math.round(note * 10) === note * 10
  );
}

export function createMoodEntry(params: {
  date: IsoDate;
  colors: readonly MoodColor[];
  description?: string;
  note?: number;
}): MoodEntry {
  const colors = dedupe(params.colors);

  if (colors.length === 0) {
    throw new Error('Un registro de ánimo necesita al menos un color');
  }
  if (colors.length > MAX_MOODS_PER_DAY) {
    throw new Error(`Un día puede tener como máximo ${MAX_MOODS_PER_DAY} estados de ánimo`);
  }

  const description = params.description?.trim();

  let note: number | undefined;
  if (params.note != null) {
    const rounded = Math.round(params.note * 10) / 10;
    if (!isValidNote(rounded)) {
      throw new Error(`La nota debe estar entre ${NOTE_MIN} y ${NOTE_MAX}, con hasta un decimal`);
    }
    note = rounded;
  }

  return {
    date: params.date,
    colors,
    description: description && description.length > 0 ? description : undefined,
    note,
  };
}

function dedupe(colors: readonly MoodColor[]): MoodColor[] {
  return colors.filter((color, index) => colors.indexOf(color) === index);
}
