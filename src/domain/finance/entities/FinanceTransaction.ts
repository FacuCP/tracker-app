import { IsoDate } from '../../../core/utils/date';

/** Un movimiento: un ingreso (suma) o un gasto (resta). */
export type FinanceKind = 'income' | 'expense';

/**
 * Repetición mensual del movimiento. `months = null` → se repite
 * indefinidamente; `months = N` → ocurre N veces en total (contando la
 * primera). Siempre cae el mismo día del mes que la fecha inicial (si el mes
 * es más corto, el último día).
 */
export interface FinanceRepeat {
  readonly months: number | null;
}

/**
 * Un cambio de monto de un movimiento que se repite: a partir de `from`
 * (inclusive), cada ocurrencia pasa a valer `amount`. Se pueden encadenar
 * varios; el último cuyo `from` es <= la fecha de la ocurrencia gana.
 */
export interface FinanceAmountChange {
  readonly from: IsoDate;
  readonly amount: number;
}

export interface FinanceTransaction {
  readonly id: string;
  readonly kind: FinanceKind;
  readonly name: string;
  readonly date: IsoDate;
  readonly comment?: string;
  /** Monto inicial, en positivo y mayor a 0. El signo lo da `kind`. */
  readonly amount: number;
  /** Categoría propia; si es undefined, cae en "General". */
  readonly categoryId?: string;
  /** Si es null, el movimiento ocurre una sola vez. */
  readonly repeat: FinanceRepeat | null;
  /** Ajustes de monto para las repeticiones, ordenados por `from` ascendente. */
  readonly adjustments: readonly FinanceAmountChange[];
  /**
   * Fecha en la que se marcó como finalizado un movimiento con repetición: las
   * ocurrencias posteriores a esta fecha dejan de contar. undefined = sigue.
   */
  readonly finishedOn?: IsoDate;
}

export const MAX_FINANCE_NAME = 60;

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Normaliza los ajustes: valida, ordena por fecha y deja uno solo por fecha (el último). */
export function normalizeAdjustments(
  adjustments: readonly FinanceAmountChange[] | undefined,
): FinanceAmountChange[] {
  if (!adjustments || adjustments.length === 0) return [];
  const byDate = new Map<IsoDate, number>();
  for (const change of adjustments) {
    if (!isIsoDate(change.from)) {
      throw new Error('Fecha de ajuste inválida');
    }
    if (!Number.isFinite(change.amount) || change.amount <= 0) {
      throw new Error('El monto del ajuste tiene que ser mayor a 0');
    }
    byDate.set(change.from, round2(change.amount));
  }
  return [...byDate.entries()]
    .map(([from, amount]) => ({ from, amount }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

export function createFinanceTransaction(params: {
  id: string;
  kind: FinanceKind;
  name: string;
  date: IsoDate;
  comment?: string;
  amount: number;
  categoryId?: string;
  repeat?: FinanceRepeat | null;
  adjustments?: readonly FinanceAmountChange[];
  finishedOn?: IsoDate;
}): FinanceTransaction {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('El movimiento necesita un nombre');
  }
  if (name.length > MAX_FINANCE_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_FINANCE_NAME} caracteres`);
  }
  if (!isIsoDate(params.date)) {
    throw new Error('Fecha inválida');
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error('El monto tiene que ser un número mayor a 0');
  }

  let repeat: FinanceRepeat | null = null;
  if (params.repeat) {
    const months = params.repeat.months;
    if (months !== null) {
      if (!Number.isInteger(months) || months < 1) {
        throw new Error('La cantidad de meses tiene que ser un entero mayor o igual a 1');
      }
    }
    repeat = { months };
  }

  if (params.finishedOn != null && !isIsoDate(params.finishedOn)) {
    throw new Error('Fecha de finalización inválida');
  }

  const comment = params.comment?.trim();

  return {
    id: params.id,
    kind: params.kind,
    name,
    date: params.date,
    comment: comment && comment.length > 0 ? comment : undefined,
    amount: round2(params.amount),
    categoryId: params.categoryId,
    repeat,
    adjustments: repeat ? normalizeAdjustments(params.adjustments) : [],
    finishedOn: repeat ? params.finishedOn : undefined,
  };
}

export function financeKindSign(kind: FinanceKind): 1 | -1 {
  return kind === 'income' ? 1 : -1;
}
