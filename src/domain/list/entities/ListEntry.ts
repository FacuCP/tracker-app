import { IsoDate } from '../../../core/utils/date';

/**
 * Una entrada de una lista: nombre, fecha, comentario opcional y rating
 * opcional (un número).
 */
export interface ListEntry {
  readonly id: string;
  readonly listId: string;
  readonly name: string;
  readonly date: IsoDate;
  readonly comment?: string;
  readonly rating?: number;
}

export const MAX_ENTRY_NAME = 80;

export type ListSort = 'date' | 'alpha' | 'rating';

export function createListEntry(params: {
  id: string;
  listId: string;
  name: string;
  date: IsoDate;
  comment?: string;
  rating?: number;
}): ListEntry {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('La entrada necesita un nombre');
  }
  if (name.length > MAX_ENTRY_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_ENTRY_NAME} caracteres`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    throw new Error('Fecha inválida');
  }

  let rating: number | undefined;
  if (params.rating != null) {
    if (!Number.isFinite(params.rating) || params.rating < 0) {
      throw new Error('El rating tiene que ser un número mayor o igual a 0');
    }
    rating = Math.round(params.rating * 100) / 100;
  }

  const comment = params.comment?.trim();

  return {
    id: params.id,
    listId: params.listId,
    name,
    date: params.date,
    comment: comment && comment.length > 0 ? comment : undefined,
    rating,
  };
}

function byNameAsc(a: ListEntry, b: ListEntry): number {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

/**
 * Comparador de entradas según el criterio elegido:
 * - `date`: fecha descendente (más reciente primero), desempata alfabético.
 * - `alpha`: alfabético por nombre, desempata por fecha descendente.
 * - `rating`: rating descendente (las sin rating al final), desempata alfabético.
 */
export function compareListEntries(a: ListEntry, b: ListEntry, sort: ListSort): number {
  if (sort === 'alpha') {
    return byNameAsc(a, b) || b.date.localeCompare(a.date);
  }
  if (sort === 'rating') {
    const ra = a.rating ?? Number.NEGATIVE_INFINITY;
    const rb = b.rating ?? Number.NEGATIVE_INFINITY;
    return rb - ra || byNameAsc(a, b);
  }
  return b.date.localeCompare(a.date) || byNameAsc(a, b);
}
