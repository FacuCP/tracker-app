import { IsoDate, todayIso } from '../../../core/utils/date';

/**
 * Una entrada de una lista: nombre, fecha (opcional), comentario opcional y
 * rating opcional (un número). En las to-do lists la fecha es la **fecha de
 * vencimiento** y puede no ponerse.
 */
export interface ListEntry {
  readonly id: string;
  readonly listId: string;
  readonly name: string;
  /** Fecha de la entrada / vencimiento de la tarea. Puede no tener. */
  readonly date?: IsoDate;
  readonly comment?: string;
  /** Número libre. En listas normales es el "rating"; en to-do lists, la "prioridad". */
  readonly rating?: number;
  /** Solo relevante en to-do lists: si la tarea está completada. */
  readonly done: boolean;
}

export const MAX_ENTRY_NAME = 80;

export type ListSort = 'date' | 'alpha' | 'rating';

export function createListEntry(params: {
  id: string;
  listId: string;
  name: string;
  date?: IsoDate | null;
  comment?: string;
  rating?: number;
  done?: boolean;
}): ListEntry {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('La entrada necesita un nombre');
  }
  if (name.length > MAX_ENTRY_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_ENTRY_NAME} caracteres`);
  }

  let date: IsoDate | undefined;
  if (params.date != null && params.date !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      throw new Error('Fecha inválida');
    }
    date = params.date;
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
    date,
    comment: comment && comment.length > 0 ? comment : undefined,
    rating,
    done: params.done ?? false,
  };
}

/** Una tarea vencida: tiene fecha de vencimiento pasada y no está completada. */
export function isEntryOverdue(entry: ListEntry, today: IsoDate = todayIso()): boolean {
  return entry.date != null && !entry.done && entry.date < today;
}

function byNameAsc(a: ListEntry, b: ListEntry): number {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

/** Fecha desc; las entradas sin fecha van al final. */
function byDateDesc(a?: IsoDate, b?: IsoDate): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b.localeCompare(a);
}

/**
 * Comparador de entradas según el criterio elegido:
 * - `date`: fecha descendente (las sin fecha al final), desempata alfabético.
 * - `alpha`: alfabético por nombre, desempata por fecha descendente.
 * - `rating`: rating descendente (las sin rating al final), desempata alfabético.
 */
export function compareListEntries(a: ListEntry, b: ListEntry, sort: ListSort): number {
  if (sort === 'alpha') {
    return byNameAsc(a, b) || byDateDesc(a.date, b.date);
  }
  if (sort === 'rating') {
    const ra = a.rating ?? Number.NEGATIVE_INFINITY;
    const rb = b.rating ?? Number.NEGATIVE_INFINITY;
    return rb - ra || byNameAsc(a, b);
  }
  return byDateDesc(a.date, b.date) || byNameAsc(a, b);
}
