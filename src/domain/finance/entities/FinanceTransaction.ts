import { IsoDate } from '../../../core/utils/date';

/** Un movimiento: un ingreso (suma) o un gasto (resta). */
export type FinanceKind = 'income' | 'expense';

/**
 * Cómo termina la repetición de un movimiento — mismo esquema que la
 * repetición de eventos (`EventRepeat`):
 *  - `never`: indefinida.
 *  - `onDate`: hasta (e incluyendo) `endDate`.
 *  - `afterCount`: después de `count` ocurrencias en total (contando la primera).
 */
export type FinanceRepeatEndType = 'never' | 'onDate' | 'afterCount';

/** Unidad del intervalo de repetición: cada cuántos días, o cada cuántos meses. */
export type FinanceRepeatUnit = 'days' | 'months';

/**
 * Repetición del movimiento. Cae cada `intervalValue` unidades
 * (`intervalUnit`) desde la fecha inicial — si es en meses, siempre el mismo
 * día del mes (si el mes es más corto, el último día).
 */
export interface FinanceRepeat {
  readonly intervalValue: number;
  readonly intervalUnit: FinanceRepeatUnit;
  readonly endType: FinanceRepeatEndType;
  readonly endDate?: IsoDate;
  readonly count?: number;
}

export const MIN_INTERVAL_VALUE = 1;
export const MAX_INTERVAL_DAYS = 3650;
export const MAX_INTERVAL_MONTHS = 120;
export const MIN_REPEAT_COUNT = 1;
export const MAX_REPEAT_COUNT = 5000;
export const DEFAULT_INTERVAL_DAYS = 7;
export const DEFAULT_INTERVAL_MONTHS = 1;

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
    const { intervalValue, intervalUnit, endType } = params.repeat;
    const maxInterval = intervalUnit === 'months' ? MAX_INTERVAL_MONTHS : MAX_INTERVAL_DAYS;
    if (!Number.isInteger(intervalValue) || intervalValue < MIN_INTERVAL_VALUE || intervalValue > maxInterval) {
      throw new Error(
        `El intervalo de repetición tiene que ser un entero entre ${MIN_INTERVAL_VALUE} y ${maxInterval}`,
      );
    }
    if (endType === 'onDate') {
      if (!params.repeat.endDate || params.repeat.endDate < params.date) {
        throw new Error('La fecha de fin tiene que ser posterior a la fecha del movimiento');
      }
      repeat = { intervalValue, intervalUnit, endType, endDate: params.repeat.endDate };
    } else if (endType === 'afterCount') {
      const count = params.repeat.count;
      if (!count || !Number.isInteger(count) || count < MIN_REPEAT_COUNT || count > MAX_REPEAT_COUNT) {
        throw new Error(
          `La cantidad de repeticiones tiene que ser un entero entre ${MIN_REPEAT_COUNT} y ${MAX_REPEAT_COUNT}`,
        );
      }
      repeat = { intervalValue, intervalUnit, endType, count };
    } else {
      repeat = { intervalValue, intervalUnit, endType: 'never' };
    }
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
