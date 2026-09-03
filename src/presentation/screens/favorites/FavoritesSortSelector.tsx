import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { FavoritesSort } from './useFavorites';

const OPTIONS: { key: FavoritesSort; label: string }[] = [
  { key: 'type', label: 'Por tipo' },
  { key: 'alpha', label: 'A-Z' },
  { key: 'recent', label: 'Recientes' },
];

interface Props {
  value: FavoritesSort;
  onChange: (sort: FavoritesSort) => void;
}

/** Control segmentado para ordenar la lista de favoritos. */
export function FavoritesSortSelector({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
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
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.card,
    elevation: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  labelActive: {
    color: theme.colors.text,
  },
});
