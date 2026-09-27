/**
 * Perfil del usuario: el nombre (se elige la primera vez), qué "cards
 * especiales" aparecen en Favoritos, el tamaño de la letra (sin usar por ahora)
 * y qué notificaciones están activadas.
 */
export interface UserProfile {
  readonly name: string;
  readonly moodFavorite: boolean;
  readonly financeFavorite: boolean;
  readonly gymFavorite: boolean;
  /** Escala de la tipografía: 1 (100%) a 1.5 (150%), en pasos de 0.1. Sin usar por ahora. */
  readonly fontScale: number;
  /** Recordatorio diario 23:00 si quedan trackers sin cargar. */
  readonly notifyTrackers: boolean;
  /** Aviso el día antes de que venza una tarea de una to-do list. */
  readonly notifyDueTasks: boolean;
}

export const MAX_USER_NAME = 30;

export const FONT_SCALE_MIN = 1;
export const FONT_SCALE_MAX = 1.5;
export const FONT_SCALE_STEP = 0.1;

export function clampFontScale(value: number): number {
  if (!Number.isFinite(value)) return FONT_SCALE_MIN;
  const stepped = Math.round(value * 10) / 10;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, stepped));
}

export function createUserProfile(params: {
  name: string;
  moodFavorite?: boolean;
  financeFavorite?: boolean;
  gymFavorite?: boolean;
  fontScale?: number;
  notifyTrackers?: boolean;
  notifyDueTasks?: boolean;
}): UserProfile {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('Poné un nombre');
  }
  if (name.length > MAX_USER_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_USER_NAME} caracteres`);
  }
  return {
    name,
    moodFavorite: params.moodFavorite ?? true,
    financeFavorite: params.financeFavorite ?? true,
    gymFavorite: params.gymFavorite ?? true,
    fontScale: clampFontScale(params.fontScale ?? FONT_SCALE_MIN),
    notifyTrackers: params.notifyTrackers ?? false,
    notifyDueTasks: params.notifyDueTasks ?? false,
  };
}
