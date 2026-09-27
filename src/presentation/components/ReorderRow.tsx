import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../core/theme';

interface Props {
  title: string;
  typeLabel: string;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
}

/** Fila compacta para modo "Ordenar": nombre + flechas ▲▼ para mover. */
export function ReorderRow({ title, typeLabel, isFirst, isLast, onUp, onDown }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.type}>{typeLabel}</Text>
      </View>
      <View style={styles.arrows}>
        <TouchableOpacity
          style={[styles.arrow, isFirst && styles.arrowDisabled]}
          onPress={onUp}
          disabled={isFirst}
          hitSlop={6}
        >
          <Text style={styles.arrowText}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.arrow, isLast && styles.arrowDisabled]}
          onPress={onDown}
          disabled={isLast}
          hitSlop={6}
        >
          <Text style={styles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  type: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  arrows: {
    flexDirection: 'row',
    gap: 6,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.accent,
  },
});
