/**
 * Perfil del usuario: el nombre (se elige la primera vez), qué "cards
 * especiales" aparecen en Favoritos (el mood tracker y el resumen de finanzas,
 * los dos arrancan en true) y el tamaño de la letra de toda la app.
 */
export interface UserProfile {
  readonly name: string;
  readonly moodFavorite: boolean;
  readonly financeFavorite: boolean;
  /** Escala de la tipografía: 1 (100%) a 1.5 (150%), en pasos de 0.1. */
  readonly fontScale: number;
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
  fontScale?: number;
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
    fontScale: clampFontScale(params.fontScale ?? FONT_SCALE_MIN),
  };
}
