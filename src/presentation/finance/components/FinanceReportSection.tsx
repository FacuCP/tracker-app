import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatDdMmYyyy } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { FinanceReport, FinanceReportItem } from '../../../domain/finance/entities/FinanceReport';
import { FinanceTransaction } from '../../../domain/finance/entities/FinanceTransaction';
import { formatMoney, formatSignedMoney } from '../money';
import { FINANCE_PERIODS, FinancePeriod } from '../period';

const INCOME = '#16a34a';
const EXPENSE = '#dc2626';

interface Props {
  report: FinanceReport;
  period: FinancePeriod;
  onPeriodChange: (period: FinancePeriod) => void;
  grouped: boolean;
  onGroupedChange: (grouped: boolean) => void;
  expandedId: string | null;
  onToggleExpanded: (id: string) => void;
  onOpenTransaction: (tx: FinanceTransaction) => void;
}

export function FinanceReportSection({
  report,
  period,
  onPeriodChange,
  grouped,
  onGroupedChange,
  expandedId,
  onToggleExpanded,
  onOpenTransaction,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        {FINANCE_PERIODS.map((option) => {
          const active = option.key === period;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => onPeriodChange(option.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.totals}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Ingresos</Text>
          <Text style={[styles.totalValue, { color: INCOME }]}>
            {formatMoney(report.incomeTotal)}
          </Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Gastos</Text>
          <Text style={[styles.totalValue, { color: EXPENSE }]}>
            {formatMoney(report.expenseTotal)}
          </Text>
        </View>
      </View>

      <View style={styles.viewToggle}>
        <ToggleButton label="Por categoría" active={grouped} onPress={() => onGroupedChange(true)} />
        <ToggleButton label="Ver todo" active={!grouped} onPress={() => onGroupedChange(false)} />
      </View>

      {report.all.length === 0 ? (
        <Text style={styles.empty}>No hay movimientos en este período.</Text>
      ) : grouped ? (
        <View style={styles.groups}>
          {report.categories.map((cat) => {
            const expanded = expandedId === cat.category.id;
            return (
              <View key={cat.category.id} style={styles.group}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => onToggleExpanded(cat.category.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: cat.category.color }]} />
                  <Text style={styles.groupName} numberOfLines={1}>
                    {cat.category.name}
                  </Text>
                  <View style={styles.groupTotals}>
                    {cat.incomeTotal > 0 ? (
                      <Text style={[styles.groupTotal, { color: INCOME }]}>
                        +{formatMoney(cat.incomeTotal)}
                      </Text>
                    ) : null}
                    {cat.expenseTotal > 0 ? (
                      <Text style={[styles.groupTotal, { color: EXPENSE }]}>
                        -{formatMoney(cat.expenseTotal)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
                </TouchableOpacity>
                {expanded ? (
                  <View style={styles.items}>
                    {cat.items.map((item, index) => (
                      <ItemRow
                        key={`${item.transaction.id}-${item.date}-${index}`}
                        item={item}
                        onPress={() => onOpenTransaction(item.transaction)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.flatList}>
          {report.all.map((item, index) => (
            <ItemRow
              key={`${item.transaction.id}-${item.date}-${index}`}
              item={item}
              onPress={() => onOpenTransaction(item.transaction)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.toggleButton, active && styles.toggleButtonActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function installmentLabel(item: FinanceReportItem): string | null {
  if (!item.recurring) return null;
  const total = item.transaction.repeat?.months;
  return total != null ? `cuota ${item.index + 1}/${total}` : `mes ${item.index + 1}`;
}

function ItemRow({ item, onPress }: { item: FinanceReportItem; onPress: () => void }) {
  const { transaction } = item;
  const installment = installmentLabel(item);
  return (
    <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.itemTexts}>
        <Text style={styles.itemName} numberOfLines={1}>
          {transaction.name}
        </Text>
        <Text style={styles.itemDate}>
          {formatDdMmYyyy(item.date)}
          {installment ? <Text style={styles.recurring}>  ·  {installment}</Text> : null}
        </Text>
      </View>
      <Text
        style={[styles.itemAmount, { color: transaction.kind === 'income' ? INCOME : EXPENSE }]}
      >
        {formatSignedMoney(item.amount, transaction.kind)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#dfe2ec',
    borderRadius: 10,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: theme.colors.card,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.text,
  },
  totals: {
    flexDirection: 'row',
    gap: 12,
  },
  totalBox: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  totalLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: '#eff6ff',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  toggleTextActive: {
    color: '#1e3a8a',
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 13,
    paddingVertical: 12,
  },
  groups: {
    gap: 8,
  },
  group: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  groupName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  groupTotals: {
    alignItems: 'flex-end',
  },
  groupTotal: {
    fontSize: 12,
    fontWeight: '800',
  },
  chevron: {
    color: theme.colors.textMuted,
    fontSize: 12,
    width: 14,
    textAlign: 'center',
  },
  items: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 12,
  },
  flatList: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  itemTexts: {
    flex: 1,
    gap: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  recurring: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  itemDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
});
