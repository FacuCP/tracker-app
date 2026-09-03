import { IsoDate } from '../../../core/utils/date';
import {
  FinanceCategory,
  GENERAL_CATEGORY,
  GENERAL_CATEGORY_ID,
} from '../entities/FinanceCategory';
import {
  FinanceCategoryReport,
  FinanceReport,
  FinanceReportItem,
} from '../entities/FinanceReport';
import { FinanceTransaction } from '../entities/FinanceTransaction';
import { financeOccurrencesInRange } from '../entities/occurrences';
import { FinanceCategoryRepository } from '../repositories/FinanceCategoryRepository';
import { FinanceTransactionRepository } from '../repositories/FinanceTransactionRepository';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Arma el reporte de un período: totales de ingresos y gastos, el desglose por
 * categoría (con los movimientos de cada una) y la lista completa sin separar.
 */
export class GetFinanceReport {
  constructor(
    private readonly transactions: FinanceTransactionRepository,
    private readonly categories: FinanceCategoryRepository,
  ) {}

  async execute(startIso: IsoDate, endIso: IsoDate): Promise<FinanceReport> {
    const [txs, cats] = await Promise.all([
      this.transactions.getAll(),
      this.categories.getAll(),
    ]);
    const byId = new Map(cats.map((c) => [c.id, c]));

    const items: FinanceReportItem[] = [];
    for (const tx of txs) {
      for (const occ of financeOccurrencesInRange(tx, startIso, endIso)) {
        items.push({
          transaction: tx,
          date: occ.date,
          amount: occ.amount,
          index: occ.index,
          recurring: tx.repeat != null,
        });
      }
    }
    items.sort(
      (a, b) => b.date.localeCompare(a.date) || a.transaction.name.localeCompare(b.transaction.name, 'es'),
    );

    const groups = new Map<string, FinanceReportItem[]>();
    for (const item of items) {
      const category = resolveCategory(item.transaction, byId);
      const bucket = groups.get(category.id);
      if (bucket) bucket.push(item);
      else groups.set(category.id, [item]);
    }

    const categoryReports: FinanceCategoryReport[] = [...groups.entries()].map(([id, its]) => {
      const category = id === GENERAL_CATEGORY_ID ? GENERAL_CATEGORY : byId.get(id) ?? GENERAL_CATEGORY;
      return {
        category,
        incomeTotal: round2(sumAmount(its, 'income')),
        expenseTotal: round2(sumAmount(its, 'expense')),
        items: its,
      };
    });
    categoryReports.sort((a, b) => {
      if (a.category.id === GENERAL_CATEGORY_ID) return 1;
      if (b.category.id === GENERAL_CATEGORY_ID) return -1;
      return a.category.name.localeCompare(b.category.name, 'es', { sensitivity: 'base' });
    });

    const incomeTotal = round2(sumAmount(items, 'income'));
    const expenseTotal = round2(sumAmount(items, 'expense'));

    return {
      incomeTotal,
      expenseTotal,
      net: round2(incomeTotal - expenseTotal),
      categories: categoryReports,
      all: items,
    };
  }
}

function resolveCategory(
  tx: FinanceTransaction,
  byId: Map<string, FinanceCategory>,
): FinanceCategory {
  if (tx.categoryId) {
    const found = byId.get(tx.categoryId);
    if (found) return found;
  }
  return GENERAL_CATEGORY;
}

function sumAmount(items: readonly FinanceReportItem[], kind: 'income' | 'expense'): number {
  return items.reduce(
    (acc, item) => (item.transaction.kind === kind ? acc + item.amount : acc),
    0,
  );
}
