import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { FinanceCategoriesModal } from '../../finance/components/FinanceCategoriesModal';
import { FinanceReportSection } from '../../finance/components/FinanceReportSection';
import { FinanceSummaryCard } from '../../finance/components/FinanceSummaryCard';
import { FinanceTransactionModal } from '../../finance/components/FinanceTransactionModal';
import { amountInputFromNumber } from '../../finance/money';
import { useFinances } from './useFinances';

type Props = NativeStackScreenProps<RootStackParamList, 'Finances'>;

export function FinancesScreen({ navigation, route }: Props) {
  const vm = useFinances();
  const { openNew } = vm;

  useEffect(() => {
    const add = route.params?.add;
    if (add) {
      navigation.setParams({ add: undefined });
      openNew(add);
    }
  }, [route.params?.add, navigation, openNew]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <FinanceSummaryCard
          balance={vm.balance}
          favorite={vm.favorite}
          onToggleFavorite={vm.toggleFavorite}
          onAddIncome={() => vm.openNew('income')}
          onAddExpense={() => vm.openNew('expense')}
        />

        <View style={styles.reportHeader}>
          <Text style={styles.reportTitle}>Movimientos</Text>
          <TouchableOpacity onPress={vm.openCategories} hitSlop={8}>
            <Text style={styles.categoriesLink}>Categorías</Text>
          </TouchableOpacity>
        </View>

        {vm.loading || !vm.report ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <FinanceReportSection
            report={vm.report}
            period={vm.period}
            onPeriodChange={vm.setPeriod}
            grouped={vm.grouped}
            onGroupedChange={vm.setGrouped}
            expandedId={vm.expandedId}
            onToggleExpanded={vm.toggleExpanded}
            onOpenTransaction={vm.openEdit}
          />
        )}
      </ScrollView>

      {vm.formKind ? (
        <FinanceTransactionModal
          visible
          kind={vm.formKind}
          categories={vm.categories}
          initial={
            vm.editing
              ? {
                  kind: vm.editing.kind,
                  name: vm.editing.name,
                  date: vm.editing.date,
                  comment: vm.editing.comment ?? '',
                  amount: amountInputFromNumber(vm.editing.amount),
                  categoryId: vm.editing.categoryId,
                  repeats: vm.editing.repeat != null,
                  repeatIntervalValue: vm.editing.repeat?.intervalValue ?? 1,
                  repeatIntervalUnit: vm.editing.repeat?.intervalUnit ?? 'months',
                  repeatEndType: vm.editing.repeat?.endType ?? 'never',
                  repeatEndDate: vm.editing.repeat?.endDate ?? vm.editing.date,
                  repeatCount: vm.editing.repeat?.count ?? 1,
                  adjustments: vm.editing.adjustments.map((a) => ({ ...a })),
                  finished: vm.editing.finishedOn != null,
                }
              : null
          }
          onClose={vm.closeForm}
          onSave={vm.saveTransaction}
          onDelete={vm.editing ? vm.deleteTransaction : undefined}
        />
      ) : null}

      <FinanceCategoriesModal
        visible={vm.categoriesOpen}
        categories={vm.categories}
        onClose={vm.closeCategories}
        onSave={vm.saveCategory}
        onDelete={vm.deleteCategory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 14,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  categoriesLink: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  loader: {
    marginTop: 32,
  },
});
