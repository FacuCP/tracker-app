/**
 * Deja solo strings no vacíos, sin repetidos, preservando el orden — para
 * listas de ids guardadas como "orden manual" (Favoritos, Listas, Trackers).
 */
export function sanitizeIdOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value === 'string' && value.length > 0 && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

/**
 * Aplica un orden manual guardado (ids) a una lista de ítems con `id`: los
 * que están en `order` van primero en ese orden, el resto queda al final en
 * su orden original. Mismo criterio que ya usa `useFavorites` a mano.
 */
export function applyIdOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  const used = new Set<string>();
  for (const id of order) {
    const item = byId.get(id);
    if (item && !used.has(id)) {
      ordered.push(item);
      used.add(id);
    }
  }
  for (const item of items) {
    if (!used.has(item.id)) ordered.push(item);
  }
  return ordered;
}
