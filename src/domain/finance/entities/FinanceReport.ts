import { IsoDate } from '../../../core/utils/date';
import { FinanceCategory } from './FinanceCategory';
import { FinanceTransaction } from './FinanceTransaction';

/** Una ocurrencia concreta de un movimiento dentro del período mirado. */
export interface FinanceReportItem {
  readonly transaction: FinanceTransaction;
  /** Fecha en la que impactó (puede no ser la fecha inicial si se repite). */
  readonly date: IsoDate;
  /** Monto vigente de esta ocurrencia (después de los ajustes). */
  readonly amount: number;
  /** Número de ocurrencia, 0 = la primera. */
  readonly index: number;
  readonly recurring: boolean;
}

export interface FinanceCategoryReport {
  readonly category: FinanceCategory;
  readonly incomeTotal: number;
  readonly expenseTotal: number;
  readonly items: readonly FinanceReportItem[];
}

export interface FinanceReport {
  readonly incomeTotal: number;
  readonly expenseTotal: number;
  readonly net: number;
  /** Por categoría (General siempre al final). */
  readonly categories: readonly FinanceCategoryReport[];
  /** Todos los movimientos del período, sin separar por categoría. */
  readonly all: readonly FinanceReportItem[];
}
