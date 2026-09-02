import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { ListSort } from '../../../domain/list/entities/ListEntry';

interface Props {
  value: ListSort;
  onChange: (sort: ListSort) => void;
  /** En una to-do list, el "rating" se llama "prioridad". */
  isTodo?: boolean;
}

/** Control segmentado para elegir cómo se ordenan las entradas. */
export function ListSortSelector({ value, onChange, isTodo = false }: Props) {
  const options: { key: ListSort; label: string }[] = [
    { key: 'date', label: 'Fecha' },
    { key: 'alpha', label: 'A-Z' },
    { key: 'rating', label: isTodo ? 'Prioridad' : 'Rating' },
  ];

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(option.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
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
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  labelActive: {
    color: theme.colors.text,
  },
});
