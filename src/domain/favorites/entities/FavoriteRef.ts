/**
 * Referencia a un ítem de la pantalla Favoritos, serializada como string para
 * guardar el orden que eligió el usuario:
 *   - `"finance"` y `"mood"` son singletons (el resumen de finanzas y el mood tracker).
 *   - `"tracker:<id>"` y `"list:<id>"` apuntan a un tracker o lista del usuario.
 */
export type FavoriteRefKind = 'finance' | 'mood' | 'tracker' | 'list';

export interface FavoriteRef {
  readonly kind: FavoriteRefKind;
  readonly id?: string;
}

export function favoriteRefKey(ref: FavoriteRef): string {
  if (ref.kind === 'finance' || ref.kind === 'mood') return ref.kind;
  return `${ref.kind}:${ref.id ?? ''}`;
}

export function parseFavoriteRef(key: string): FavoriteRef | null {
  if (key === 'finance' || key === 'mood') return { kind: key };
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
