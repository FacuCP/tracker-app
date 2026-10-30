import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { todayIso } from '../../../core/utils/date';
import { FinanceCategory } from '../../../domain/finance/entities/FinanceCategory';
import { FinanceReport } from '../../../domain/finance/entities/FinanceReport';
import { FinanceKind, FinanceTransaction } from '../../../domain/finance/entities/FinanceTransaction';
import { FinanceCategoryDraft } from '../../finance/components/FinanceCategoriesModal';
import { FinanceTransactionDraft } from '../../finance/components/FinanceTransactionModal';
import { parseAmount } from '../../finance/money';
import { FinancePeriod, financePeriodRange } from '../../finance/period';

/** ViewModel de la pantalla Finanzas. */
export function useFinances() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [favorite, setFavorite] = useState(true);

  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [grouped, setGrouped] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formKind, setFormKind] = useState<FinanceKind | null>(null);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [start, end] = useMemo(() => financePeriodRange(period), [period]);

  const reload = useCallback(async () => {
    const [bal, rep, cats, profile] = await Promise.all([
      container.getCurrentBalance.execute(),
      container.getFinanceReport.execute(start, end),
      container.getFinanceCategories.execute(),
      container.getUserProfile.execute(),
    ]);
    setBalance(bal);
    setReport(rep);
    setCategories(cats);
    setFavorite(profile?.financeFavorite ?? true);
    setLoading(false);
  }, [start, end]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      reload().catch(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [reload]),
  );

  const saveTransaction = useCallback(
    async (draft: FinanceTransactionDraft) => {
      const parsed = parseAmount(draft.amount);
      if (parsed.amount == null) return;
      const repeat = draft.repeats
        ? {
            intervalValue: draft.repeatIntervalValue,
            intervalUnit: draft.repeatIntervalUnit,
            endType: draft.repeatEndType,
            endDate: draft.repeatEndType === 'onDate' ? draft.repeatEndDate : undefined,
            count: draft.repeatEndType === 'afterCount' ? draft.repeatCount : undefined,
          }
        : null;
      await container.saveFinanceTransaction.execute({
        id: editing?.id,
        kind: draft.kind,
        name: draft.name,
        date: draft.date,
        comment: draft.comment,
        amount: parsed.amount,
        categoryId: draft.categoryId,
        repeat,
        adjustments: repeat ? draft.adjustments : [],
        finishedOn:
          repeat && draft.finished ? editing?.finishedOn ?? todayIso() : undefined,
      });
      setFormKind(null);
      setEditing(null);
      await reload();
    },
    [editing, reload],
  );

  const deleteTransaction = useCallback(async () => {
    if (!editing) return;
    await container.deleteFinanceTransaction.execute(editing.id);
    setEditing(null);
    setFormKind(null);
    await reload();
  }, [editing, reload]);

  const saveCategory = useCallback(
    async (draft: FinanceCategoryDraft) => {
      await container.saveFinanceCategory.execute({
        id: draft.id,
        name: draft.name,
        color: draft.color,
      });
      await reload();
    },
    [reload],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await container.deleteFinanceCategory.execute(id);
      await reload();
    },
    [reload],
  );

  const toggleFavorite = useCallback(async () => {
    const next = !favorite;
    setFavorite(next);
    await container.updateUserProfile.execute({ financeFavorite: next });
  }, [favorite]);

  return {
    loading,
    balance,
    report,
    categories,
    favorite,
    toggleFavorite,
    period,
    setPeriod,
    grouped,
    setGrouped,
    expandedId,
    toggleExpanded: (id: string) => setExpandedId((prev) => (prev === id ? null : id)),

    formKind,
    editing,
    openNew: (kind: FinanceKind) => {
      setEditing(null);
      setFormKind(kind);
    },
    openEdit: (tx: FinanceTransaction) => {
      setFormKind(tx.kind);
      setEditing(tx);
    },
    closeForm: () => {
      setFormKind(null);
      setEditing(null);
    },
    saveTransaction,
    deleteTransaction,

    categoriesOpen,
    openCategories: () => setCategoriesOpen(true),
    closeCategories: () => setCategoriesOpen(false),
    saveCategory,
    deleteCategory,
  };
}
