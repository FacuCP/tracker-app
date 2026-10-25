import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CalendarView } from './useCalendarPeriod';

interface Props {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
  /** Versión más chica (menos padding, texto más chico), para pantallas con poco alto disponible. */
  compact?: boolean;
}

const OPTIONS: { key: CalendarView; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
];

/** Control segmentado para elegir la vista del calendario. */
export function CalendarViewSwitch({ value, onChange, compact = false }: Props) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.segment, compact && styles.segmentCompact, active && styles.segmentActive]}
            onPress={() => onChange(option.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, compact && styles.labelCompact, active && styles.labelActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#dfe2ec',
    borderRadius: 10,
    padding: 3,
  },
  containerCompact: {
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentCompact: {
    paddingVertical: 4,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#f8f9fc',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  labelCompact: {
    fontSize: 11,
  },
  labelActive: {
    color: '#111827',
  },
});
