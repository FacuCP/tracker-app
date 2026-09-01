/**
 * Perfil del usuario: el nombre que se elige la primera vez que se abre la app
 * y la pestaña que se muestra al arrancar. Ambos se editan en Ajustes.
 */
export type HubTab = 'Trackers' | 'Lists' | 'Finances';

export const HUB_TABS: readonly HubTab[] = ['Trackers', 'Lists', 'Finances'];

export const DEFAULT_HUB_TAB: HubTab = 'Trackers';

export function isHubTab(value: unknown): value is HubTab {
  return typeof value === 'string' && (HUB_TABS as readonly string[]).includes(value);
}

export interface UserProfile {
  readonly name: string;
  readonly defaultTab: HubTab;
}

export const MAX_USER_NAME = 30;

export function createUserProfile(params: { name: string; defaultTab?: HubTab }): UserProfile {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('Poné un nombre');
  }
  if (name.length > MAX_USER_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_USER_NAME} caracteres`);
  }
  return {
    name,
    defaultTab: params.defaultTab && isHubTab(params.defaultTab) ? params.defaultTab : DEFAULT_HUB_TAB,
  };
}
