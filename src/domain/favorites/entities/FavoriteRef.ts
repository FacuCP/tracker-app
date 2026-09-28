/**
 * Referencia a un ítem de la pantalla Favoritos, serializada como string para
 * guardar el orden que eligió el usuario:
 *   - `"finance"`, `"mood"` y `"gym"` son singletons (resumen de finanzas,
 *     mood tracker y "Rutina de hoy").
 *   - `"tracker:<id>"` y `"list:<id>"` apuntan a un tracker o lista del usuario.
 */
export type FavoriteRefKind = 'finance' | 'mood' | 'gym' | 'tracker' | 'list';

const SINGLETON_KINDS: readonly FavoriteRefKind[] = ['finance', 'mood', 'gym'];

export interface FavoriteRef {
  readonly kind: FavoriteRefKind;
  readonly id?: string;
}

export function favoriteRefKey(ref: FavoriteRef): string {
  if ((SINGLETON_KINDS as readonly string[]).includes(ref.kind)) return ref.kind;
  return `${ref.kind}:${ref.id ?? ''}`;
}

export function parseFavoriteRef(key: string): FavoriteRef | null {
  if ((SINGLETON_KINDS as readonly string[]).includes(key)) {
    return { kind: key as FavoriteRefKind };
  }
  const [kind, ...rest] = key.split(':');
  const id = rest.join(':');
  if ((kind === 'tracker' || kind === 'list') && id.length > 0) {
    return { kind, id };
  }
  return null;
}

/** Deja solo strings, sin repetidos, preservando el orden. */
export function sanitizeFavoritesOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value === 'string' && !seen.has(value) && parseFavoriteRef(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}
