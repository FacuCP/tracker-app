/** Pestaña que se muestra al abrir la app. */
export type HomeTab = 'favorites' | 'trackers' | 'lists' | 'finances' | 'gym' | 'events';

export const HOME_TABS: readonly HomeTab[] = ['favorites', 'trackers', 'lists', 'finances', 'gym', 'events'];
export const DEFAULT_HOME_TAB: HomeTab = 'favorites';

/**
 * Perfil del usuario: el nombre (se elige la primera vez), qué "cards
 * especiales" aparecen en Favoritos, el tamaño de la letra (sin usar por ahora),
 * qué notificaciones están activadas, y qué pestaña se abre por defecto.
 */
export interface UserProfile {
  readonly name: string;
  readonly moodFavorite: boolean;
  readonly financeFavorite: boolean;
  readonly gymFavorite: boolean;
  readonly dailyRoutineFavorite: boolean;
  /** Escala de la tipografía: 1 (100%) a 1.5 (150%), en pasos de 0.1. Sin usar por ahora. */
  readonly fontScale: number;
  /** Recordatorio diario 23:00 si quedan trackers sin cargar. */
  readonly notifyTrackers: boolean;
  /** Aviso el día antes de que venza una tarea de una to-do list. */
  readonly notifyDueTasks: boolean;
  /** Pestaña que se abre al iniciar la app. Por defecto, Favoritos. */
  readonly homeTab: HomeTab;
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
  dailyRoutineFavorite?: boolean;
  fontScale?: number;
  notifyTrackers?: boolean;
  notifyDueTasks?: boolean;
  homeTab?: HomeTab;
}): UserProfile {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('Poné un nombre');
  }
  if (name.length > MAX_USER_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_USER_NAME} caracteres`);
  }
  const homeTab = params.homeTab ?? DEFAULT_HOME_TAB;
  if (!HOME_TABS.includes(homeTab)) {
    throw new Error(`Pestaña de inicio inválida: ${homeTab}`);
  }
  return {
    name,
    moodFavorite: params.moodFavorite ?? true,
    financeFavorite: params.financeFavorite ?? true,
    gymFavorite: params.gymFavorite ?? true,
    dailyRoutineFavorite: params.dailyRoutineFavorite ?? true,
    fontScale: clampFontScale(params.fontScale ?? FONT_SCALE_MIN),
    notifyTrackers: params.notifyTrackers ?? false,
    notifyDueTasks: params.notifyDueTasks ?? false,
    homeTab,
  };
}
