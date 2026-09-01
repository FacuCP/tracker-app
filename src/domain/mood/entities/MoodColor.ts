/**
 * Los estados de ánimo del mood tracker se modelan como un conjunto cerrado
 * de "colores". Cada color tiene un significado y un valor hexadecimal para
 * pintarlo en la UI. Esto vive en el dominio porque es una regla de negocio:
 * son estos nueve y no otros.
 */
export type MoodColor =
  | 'orange'
  | 'violet'
  | 'red'
  | 'pink'
  | 'gray'
  | 'green'
  | 'blue'
  | 'yellow'
  | 'brown';

export interface MoodColorInfo {
  readonly color: MoodColor;
  /** Nombre del color en español */
  readonly name: string;
  /** Qué estado de ánimo representa */
  readonly meaning: string;
  /** Valor para pintar en la UI */
  readonly hex: string;
}

export const MOOD_COLORS: readonly MoodColorInfo[] = [
  { color: 'orange', name: 'Naranja', meaning: 'Bien, tranquilo', hex: '#F5A623' },
  { color: 'violet', name: 'Violeta', meaning: 'Nervioso, estresado', hex: '#8B5CF6' },
  { color: 'red', name: 'Rojo', meaning: 'Enojado, frustrado', hex: '#E5484D' },
  { color: 'pink', name: 'Rosa', meaning: 'Alegre, emocionado', hex: '#EC4899' },
  { color: 'gray', name: 'Gris', meaning: 'Triste, apático', hex: '#9AA0A6' },
  { color: 'green', name: 'Verde', meaning: 'Energizado, motivado', hex: '#22C55E' },
  { color: 'blue', name: 'Azul', meaning: 'Cansado, desmotivado', hex: '#3B82F6' },
  { color: 'yellow', name: 'Amarillo', meaning: 'Seguro, confiado', hex: '#FACC15' },
  { color: 'brown', name: 'Marrón', meaning: 'Inseguro, raro', hex: '#8B5E3C' },
];

const MOOD_COLOR_BY_KEY = new Map<MoodColor, MoodColorInfo>(
  MOOD_COLORS.map((info) => [info.color, info]),
);

export function getMoodColorInfo(color: MoodColor): MoodColorInfo {
  const info = MOOD_COLOR_BY_KEY.get(color);
  if (!info) {
    throw new Error(`Color de ánimo desconocido: ${color}`);
  }
  return info;
}

export function isMoodColor(value: string): value is MoodColor {
  return MOOD_COLOR_BY_KEY.has(value as MoodColor);
}

/**
 * Orden en el que se muestran los colores en las referencias de la pantalla
 * de progreso. El primero (naranja) va solo en su fila; el resto, de a pares.
 */
export const MOOD_COLOR_DISPLAY_ORDER: readonly MoodColor[] = [
  'orange',
  'red',
  'violet',
  'pink',
  'gray',
  'green',
  'blue',
  'yellow',
  'brown',
];

export type MoodColorCounts = Record<MoodColor, number>;

/** Objeto con los nueve colores en cero, para ir sumando ocurrencias. */
export function emptyMoodColorCounts(): MoodColorCounts {
  const counts = {} as MoodColorCounts;
  for (const info of MOOD_COLORS) {
    counts[info.color] = 0;
  }
  return counts;
}
