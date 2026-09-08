import { StyleSheet, Text, View } from 'react-native';

import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { TrackerNumberStats } from '../../../domain/tracker/usecases/GetTrackerRange';

interface Props {
  tracker: Tracker;
  optionCounts: Record<string, number>;
  numberStats: TrackerNumberStats;
}

/**
 * Resumen del período: si el tracker tiene opciones, una card por opción con su
 * conteo; si tiene número, promedio / mínimo / máximo / total. Un tracker con
 * las dos cosas muestra ambos bloques.
 */
export function TrackerStats({ tracker, optionCounts, numberStats }: Props) {
  const numberCards: { label: string; value: string }[] = [
    { label: 'Registros', value: String(numberStats.count) },
    { label: 'Promedio', value: numberStats.average != null ? String(numberStats.average) : '—' },
    { label: 'Mínimo', value: numberStats.min != null ? String(numberStats.min) : '—' },
    { label: 'Máximo', value: numberStats.max != null ? String(numberStats.max) : '—' },
    { label: 'Total', value: String(numberStats.sum) },
  ];

  return (
    <View style={styles.wrap}>
      {tracker.options.length > 0 ? (
        <View style={styles.grid}>
          {tracker.options.map((option) => (
            <View key={option.id} style={styles.card}>
              <View style={styles.top}>
                <View style={[styles.swatch, { backgroundColor: option.color }]} />
                <Text style={styles.count}>{optionCounts[option.id] ?? 0}</Text>
              </View>
              <Text style={styles.label}>{option.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {tracker.hasCounter ? (
        <View style={styles.grid}>
          {numberCards.map((stat) => (
            <View key={stat.label} style={styles.card}>
              <Text style={styles.count}>{stat.value}</Text>
              <Text style={styles.label}>{stat.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: '#f8f9fc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef0f2',
    padding: 12,
    gap: 2,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  count: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '700',
  },
});
